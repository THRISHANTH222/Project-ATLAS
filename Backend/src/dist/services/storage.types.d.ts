/**
 * Custom options for file upload.
 */
export interface FileUploadOptions {
    contentType?: string;
    cacheControl?: string;
    metadata?: Record<string, string>;
    preventOverwrite?: boolean;
}
/**
 * Standardized metadata returned after file uploads or during listing.
 */
export interface FileMetadata {
    name: string;
    bucket: string;
    size: number;
    contentType?: string;
    cacheControl?: string;
    updated: string;
    metadata?: Record<string, any>;
    publicUrl: string;
}
/**
 * Custom filters for directory search.
 */
export interface ListFilesOptions {
    prefix?: string;
    maxResults?: number;
    pageToken?: string;
}
/**
 * Structured output for directory search with cursors.
 */
export interface ListFilesResult {
    files: FileMetadata[];
    nextPageToken?: string;
}
//# sourceMappingURL=storage.types.d.ts.map