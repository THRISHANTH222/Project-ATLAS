import { Readable } from 'stream';
import { Storage, Bucket, File } from '@google-cloud/storage';
import { FileUploadOptions, FileMetadata, ListFilesOptions, ListFilesResult } from './storage.types';
import { 
  StorageError, 
  FileNotFoundOrMissingError, 
  PermissionDeniedStorageError, 
  BucketNotFoundError,
  UploadFailedError,
  DownloadFailedError
} from '../errors/storage.errors';
import { logger } from '../utils/logger';
import { GcsConnectionManager } from '../config/storage';

/**
 * Enterprise-grade Google Cloud Storage concrete service layer.
 * Abstracts all file interactions (upload, download, delete, list).
 */
export class GcsStorageService {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor() {
    this.storage = GcsConnectionManager.getInstance().getStorage();
    this.bucketName = GcsConnectionManager.getInstance().getBucketName();
  }

  /**
   * Helper to retrieve the GCS Bucket instance and validate its existence.
   */
  private async getBucket(): Promise<Bucket> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      // Validate bucket existence once to ensure configuration is correct
      const [exists] = await bucket.exists();
      if (!exists) {
        throw new BucketNotFoundError(this.bucketName);
      }
      return bucket;
    } catch (error) {
      if (error instanceof BucketNotFoundError) throw error;
      throw this.handleError(error, { action: 'getBucket' });
    }
  }

  /**
   * Centralized GCS SDK error mapper to custom StorageError domains.
   */
  private handleError(error: any, context?: { path?: string; action: string }): Error {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error : new Error(errMsg);

    logger.error(`GCS operation failed: [Action: ${context?.action}] on [Path: ${context?.path || 'N/A'}]`, error, context);

    if (error.code === 404 || errMsg.includes('Not Found') || errMsg.includes('not found')) {
      if (context?.path) {
        return new FileNotFoundOrMissingError(context.path, errStack);
      }
      return new BucketNotFoundError(this.bucketName, errStack);
    }

    if (error.code === 403 || errMsg.includes('Permission Denied') || errMsg.includes('permission denied')) {
      return new PermissionDeniedStorageError(`GCS Access Denied: ${errMsg}`, errStack);
    }

    if (error.code === 412 || errMsg.includes('Precondition Failed') || errMsg.includes('already exists')) {
      return new UploadFailedError(`File operation rejected by precondition (e.g. file already exists): ${errMsg}`, errStack);
    }

    return new StorageError(`GCS error during ${context?.action}: ${errMsg}`, 'GCS_OPERATION_FAILED', errStack);
  }

  /**
   * Helper to convert a File object from the SDK to our clean metadata interface.
   */
  private mapFileMetadata(file: File): FileMetadata {
    const meta = file.metadata;
    return {
      name: file.name,
      bucket: file.bucket.name,
      size: Number(meta.size || 0),
      contentType: meta.contentType,
      cacheControl: meta.cacheControl,
      updated: meta.updated || new Date().toISOString(),
      metadata: meta.metadata,
      publicUrl: `https://storage.googleapis.com/${file.bucket.name}/${file.name}`,
    };
  }

  /**
   * Uploads a file from a binary buffer to Google Cloud Storage.
   * @param path Full destination path inside the bucket.
   * @param content File contents as a Buffer.
   * @param options Additional settings like contentType, metadata, preventOverwrite.
   * @returns Metadata of the uploaded file.
   */
  public async upload(path: string, content: Buffer, options: FileUploadOptions = {}): Promise<FileMetadata> {
    try {
      logger.info(`Uploading file to GCS: ${path}`, { size: content.length, contentType: options.contentType });
      const bucket = await this.getBucket();
      const file = bucket.file(path);

      // Setup write metadata
      const fileMetadata: any = {
        contentType: options.contentType || 'application/octet-stream',
        cacheControl: options.cacheControl,
        metadata: options.metadata,
      };

      // Handle overwrite prevention using condition generation
      const writeOptions: any = {};
      if (options.preventOverwrite) {
        // ifGenerationMatch = 0 means only write if the file does not exist
        writeOptions.preconditionOpts = { ifGenerationMatch: 0 };
      }

      await file.save(content, {
        metadata: fileMetadata,
        resumable: false, // false for small buffers in memory
        validation: 'md5',
        ...writeOptions,
      });

      // Fetch refreshed metadata
      await file.getMetadata();

      logger.info(`Successfully uploaded file: ${path}`);
      return this.mapFileMetadata(file);
    } catch (error) {
      throw this.handleError(error, { path, action: 'upload' });
    }
  }

  /**
   * Uploads a file via readable stream to Google Cloud Storage.
   * Useful for large files.
   * @param path Full destination path inside the bucket.
   * @param stream Node.js Readable stream source.
   * @param options Additional settings like contentType, metadata, preventOverwrite.
   * @returns Metadata of the uploaded file.
   */
  public async uploadStream(path: string, stream: Readable, options: FileUploadOptions = {}): Promise<FileMetadata> {
    return new Promise<FileMetadata>(async (resolve, reject) => {
      try {
        logger.info(`Uploading stream to GCS: ${path}`);
        const bucket = await this.getBucket();
        const file = bucket.file(path);

        const writeMetadata: any = {
          contentType: options.contentType || 'application/octet-stream',
          cacheControl: options.cacheControl,
          metadata: options.metadata,
        };

        const writeOptions: any = {
          metadata: writeMetadata,
          resumable: true,
        };

        if (options.preventOverwrite) {
          writeOptions.preconditionOpts = { ifGenerationMatch: 0 };
        }

        const writeStream = file.createWriteStream(writeOptions);

        stream.on('error', (err) => {
          logger.error(`Readable stream failed during GCS upload: ${path}`, err);
          reject(new UploadFailedError(`Source stream failed: ${err.message}`, err));
        });

        writeStream.on('error', (err) => {
          reject(this.handleError(err, { path, action: 'uploadStream' }));
        });

        writeStream.on('finish', async () => {
          try {
            await file.getMetadata();
            logger.info(`Successfully completed stream upload: ${path}`);
            resolve(this.mapFileMetadata(file));
          } catch (err) {
            reject(this.handleError(err, { path, action: 'uploadStreamGetMetadata' }));
          }
        });

        stream.pipe(writeStream);
      } catch (error) {
        reject(this.handleError(error, { path, action: 'uploadStreamInit' }));
      }
    });
  }

  /**
   * Downloads file contents from the bucket.
   * @param path Full path of the file to download.
   * @returns A promise resolving to a Buffer of file contents.
   * @throws FileNotFoundOrMissingError if the file does not exist.
   */
  public async download(path: string): Promise<Buffer> {
    try {
      logger.info(`Downloading file from GCS: ${path}`);
      const bucket = await this.getBucket();
      const file = bucket.file(path);

      const [exists] = await file.exists();
      if (!exists) {
        throw new FileNotFoundOrMissingError(path);
      }

      const [content] = await file.download();
      logger.info(`Successfully downloaded file: ${path} (${content.length} bytes)`);
      return content;
    } catch (error) {
      if (error instanceof FileNotFoundOrMissingError) throw error;
      throw this.handleError(error, { path, action: 'download' });
    }
  }

  /**
   * Deletes a file from the bucket.
   * Handles non-existent files safely by returning false instead of throwing.
   * @param path Full path of the file to delete.
   * @returns True if deleted, false if file did not exist.
   */
  public async delete(path: string): Promise<boolean> {
    try {
      logger.info(`Deleting file from GCS: ${path}`);
      const bucket = await this.getBucket();
      const file = bucket.file(path);

      const [exists] = await file.exists();
      if (!exists) {
        logger.warn(`Delete aborted: file does not exist: ${path}`);
        return false;
      }

      await file.delete();
      logger.info(`Successfully deleted file from GCS: ${path}`);
      return true;
    } catch (error) {
      throw this.handleError(error, { path, action: 'delete' });
    }
  }

  /**
   * Lists files in the bucket matching a prefix, with support for cursor pagination.
   * @param options Filter options including prefix, limit, pageToken.
   * @returns List result containing typed metadata and pagination token.
   */
  public async listFiles(options: ListFilesOptions = {}): Promise<ListFilesResult> {
    try {
      logger.info('Listing files in GCS...', options);
      const bucket = await this.getBucket();

      const queryParams: any = {
        autoPaginate: false,
      };

      if (options.prefix) {
        queryParams.prefix = options.prefix;
      }
      if (options.maxResults) {
        queryParams.maxResults = options.maxResults;
      }
      if (options.pageToken) {
        queryParams.pageToken = options.pageToken;
      }

      const [files, nextQuery, response] = await bucket.getFiles(queryParams);

      const mappedFiles = files.map(file => this.mapFileMetadata(file));
      const nextPageToken = (response as any)?.nextPageToken || undefined;

      logger.info(`List files search completed. Found ${mappedFiles.length} files.`);
      return {
        files: mappedFiles,
        nextPageToken,
      };
    } catch (error) {
      throw this.handleError(error, { action: 'listFiles' });
    }
  }
}
