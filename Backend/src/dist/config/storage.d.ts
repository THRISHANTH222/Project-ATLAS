import { Storage } from '@google-cloud/storage';
/**
 * Singleton connection manager for Google Cloud Storage.
 * Configures credentials and initializes the client only once.
 */
export declare class GcsConnectionManager {
    private static instance;
    private storageInstance;
    private initialized;
    private constructor();
    /**
     * Returns the singleton instance of the storage connection manager.
     */
    static getInstance(): GcsConnectionManager;
    /**
     * Initializes the Google Cloud Storage client.
     * Reads from environment configuration.
     */
    initialize(): void;
    /**
     * Retrieves the initialized Storage instance.
     */
    getStorage(): Storage;
    /**
     * Retrieves the configured bucket name.
     */
    getBucketName(): string;
}
/**
 * Reusable storage client getter.
 */
export declare const getStorageClient: () => Storage;
//# sourceMappingURL=storage.d.ts.map