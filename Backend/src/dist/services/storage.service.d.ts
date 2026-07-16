import { Readable } from 'stream';
import { FileUploadOptions, FileMetadata, ListFilesOptions, ListFilesResult } from './storage.types';
/**
 * Enterprise-grade Google Cloud Storage concrete service layer.
 * Abstracts all file interactions (upload, download, delete, list).
 */
export declare class GcsStorageService {
    private readonly storage;
    private readonly bucketName;
    constructor();
    /**
     * Helper to retrieve the GCS Bucket instance and validate its existence.
     */
    private getBucket;
    /**
     * Centralized GCS SDK error mapper to custom StorageError domains.
     */
    private handleError;
    /**
     * Helper to convert a File object from the SDK to our clean metadata interface.
     */
    private mapFileMetadata;
    /**
     * Uploads a file from a binary buffer to Google Cloud Storage.
     * @param path Full destination path inside the bucket.
     * @param content File contents as a Buffer.
     * @param options Additional settings like contentType, metadata, preventOverwrite.
     * @returns Metadata of the uploaded file.
     */
    upload(path: string, content: Buffer, options?: FileUploadOptions): Promise<FileMetadata>;
    /**
     * Uploads a file via readable stream to Google Cloud Storage.
     * Useful for large files.
     * @param path Full destination path inside the bucket.
     * @param stream Node.js Readable stream source.
     * @param options Additional settings like contentType, metadata, preventOverwrite.
     * @returns Metadata of the uploaded file.
     */
    uploadStream(path: string, stream: Readable, options?: FileUploadOptions): Promise<FileMetadata>;
    /**
     * Downloads file contents from the bucket.
     * @param path Full path of the file to download.
     * @returns A promise resolving to a Buffer of file contents.
     * @throws FileNotFoundOrMissingError if the file does not exist.
     */
    download(path: string): Promise<Buffer>;
    /**
     * Deletes a file from the bucket.
     * Handles non-existent files safely by returning false instead of throwing.
     * @param path Full path of the file to delete.
     * @returns True if deleted, false if file did not exist.
     */
    delete(path: string): Promise<boolean>;
    /**
     * Lists files in the bucket matching a prefix, with support for cursor pagination.
     * @param options Filter options including prefix, limit, pageToken.
     * @returns List result containing typed metadata and pagination token.
     */
    listFiles(options?: ListFilesOptions): Promise<ListFilesResult>;
}
//# sourceMappingURL=storage.service.d.ts.map