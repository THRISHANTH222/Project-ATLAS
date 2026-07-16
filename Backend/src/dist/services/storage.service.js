"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GcsStorageService = void 0;
const storage_errors_1 = require("../errors/storage.errors");
const logger_1 = require("../utils/logger");
const storage_1 = require("../config/storage");
/**
 * Enterprise-grade Google Cloud Storage concrete service layer.
 * Abstracts all file interactions (upload, download, delete, list).
 */
class GcsStorageService {
    storage;
    bucketName;
    constructor() {
        this.storage = storage_1.GcsConnectionManager.getInstance().getStorage();
        this.bucketName = storage_1.GcsConnectionManager.getInstance().getBucketName();
    }
    /**
     * Helper to retrieve the GCS Bucket instance and validate its existence.
     */
    async getBucket() {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            // Validate bucket existence once to ensure configuration is correct
            const [exists] = await bucket.exists();
            if (!exists) {
                throw new storage_errors_1.BucketNotFoundError(this.bucketName);
            }
            return bucket;
        }
        catch (error) {
            if (error instanceof storage_errors_1.BucketNotFoundError)
                throw error;
            throw this.handleError(error, { action: 'getBucket' });
        }
    }
    /**
     * Centralized GCS SDK error mapper to custom StorageError domains.
     */
    handleError(error, context) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStack = error instanceof Error ? error : new Error(errMsg);
        logger_1.logger.error(`GCS operation failed: [Action: ${context?.action}] on [Path: ${context?.path || 'N/A'}]`, error, context);
        if (error.code === 404 || errMsg.includes('Not Found') || errMsg.includes('not found')) {
            if (context?.path) {
                return new storage_errors_1.FileNotFoundOrMissingError(context.path, errStack);
            }
            return new storage_errors_1.BucketNotFoundError(this.bucketName, errStack);
        }
        if (error.code === 403 || errMsg.includes('Permission Denied') || errMsg.includes('permission denied')) {
            return new storage_errors_1.PermissionDeniedStorageError(`GCS Access Denied: ${errMsg}`, errStack);
        }
        if (error.code === 412 || errMsg.includes('Precondition Failed') || errMsg.includes('already exists')) {
            return new storage_errors_1.UploadFailedError(`File operation rejected by precondition (e.g. file already exists): ${errMsg}`, errStack);
        }
        return new storage_errors_1.StorageError(`GCS error during ${context?.action}: ${errMsg}`, 'GCS_OPERATION_FAILED', errStack);
    }
    /**
     * Helper to convert a File object from the SDK to our clean metadata interface.
     */
    mapFileMetadata(file) {
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
    async upload(path, content, options = {}) {
        try {
            logger_1.logger.info(`Uploading file to GCS: ${path}`, { size: content.length, contentType: options.contentType });
            const bucket = await this.getBucket();
            const file = bucket.file(path);
            // Setup write metadata
            const fileMetadata = {
                contentType: options.contentType || 'application/octet-stream',
                cacheControl: options.cacheControl,
                metadata: options.metadata,
            };
            // Handle overwrite prevention using condition generation
            const writeOptions = {};
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
            logger_1.logger.info(`Successfully uploaded file: ${path}`);
            return this.mapFileMetadata(file);
        }
        catch (error) {
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
    async uploadStream(path, stream, options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                logger_1.logger.info(`Uploading stream to GCS: ${path}`);
                const bucket = await this.getBucket();
                const file = bucket.file(path);
                const writeMetadata = {
                    contentType: options.contentType || 'application/octet-stream',
                    cacheControl: options.cacheControl,
                    metadata: options.metadata,
                };
                const writeOptions = {
                    metadata: writeMetadata,
                    resumable: true,
                };
                if (options.preventOverwrite) {
                    writeOptions.preconditionOpts = { ifGenerationMatch: 0 };
                }
                const writeStream = file.createWriteStream(writeOptions);
                stream.on('error', (err) => {
                    logger_1.logger.error(`Readable stream failed during GCS upload: ${path}`, err);
                    reject(new storage_errors_1.UploadFailedError(`Source stream failed: ${err.message}`, err));
                });
                writeStream.on('error', (err) => {
                    reject(this.handleError(err, { path, action: 'uploadStream' }));
                });
                writeStream.on('finish', async () => {
                    try {
                        await file.getMetadata();
                        logger_1.logger.info(`Successfully completed stream upload: ${path}`);
                        resolve(this.mapFileMetadata(file));
                    }
                    catch (err) {
                        reject(this.handleError(err, { path, action: 'uploadStreamGetMetadata' }));
                    }
                });
                stream.pipe(writeStream);
            }
            catch (error) {
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
    async download(path) {
        try {
            logger_1.logger.info(`Downloading file from GCS: ${path}`);
            const bucket = await this.getBucket();
            const file = bucket.file(path);
            const [exists] = await file.exists();
            if (!exists) {
                throw new storage_errors_1.FileNotFoundOrMissingError(path);
            }
            const [content] = await file.download();
            logger_1.logger.info(`Successfully downloaded file: ${path} (${content.length} bytes)`);
            return content;
        }
        catch (error) {
            if (error instanceof storage_errors_1.FileNotFoundOrMissingError)
                throw error;
            throw this.handleError(error, { path, action: 'download' });
        }
    }
    /**
     * Deletes a file from the bucket.
     * Handles non-existent files safely by returning false instead of throwing.
     * @param path Full path of the file to delete.
     * @returns True if deleted, false if file did not exist.
     */
    async delete(path) {
        try {
            logger_1.logger.info(`Deleting file from GCS: ${path}`);
            const bucket = await this.getBucket();
            const file = bucket.file(path);
            const [exists] = await file.exists();
            if (!exists) {
                logger_1.logger.warn(`Delete aborted: file does not exist: ${path}`);
                return false;
            }
            await file.delete();
            logger_1.logger.info(`Successfully deleted file from GCS: ${path}`);
            return true;
        }
        catch (error) {
            throw this.handleError(error, { path, action: 'delete' });
        }
    }
    /**
     * Lists files in the bucket matching a prefix, with support for cursor pagination.
     * @param options Filter options including prefix, limit, pageToken.
     * @returns List result containing typed metadata and pagination token.
     */
    async listFiles(options = {}) {
        try {
            logger_1.logger.info('Listing files in GCS...', options);
            const bucket = await this.getBucket();
            const queryParams = {
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
            const nextPageToken = response?.nextPageToken || undefined;
            logger_1.logger.info(`List files search completed. Found ${mappedFiles.length} files.`);
            return {
                files: mappedFiles,
                nextPageToken,
            };
        }
        catch (error) {
            throw this.handleError(error, { action: 'listFiles' });
        }
    }
}
exports.GcsStorageService = GcsStorageService;
//# sourceMappingURL=storage.service.js.map