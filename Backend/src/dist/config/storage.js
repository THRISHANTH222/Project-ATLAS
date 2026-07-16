"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageClient = exports.GcsConnectionManager = void 0;
const storage_1 = require("@google-cloud/storage");
const logger_1 = require("../utils/logger");
const storage_errors_1 = require("../errors/storage.errors");
/**
 * Singleton connection manager for Google Cloud Storage.
 * Configures credentials and initializes the client only once.
 */
class GcsConnectionManager {
    static instance;
    storageInstance = null;
    initialized = false;
    constructor() { }
    /**
     * Returns the singleton instance of the storage connection manager.
     */
    static getInstance() {
        if (!GcsConnectionManager.instance) {
            GcsConnectionManager.instance = new GcsConnectionManager();
        }
        return GcsConnectionManager.instance;
    }
    /**
     * Initializes the Google Cloud Storage client.
     * Reads from environment configuration.
     */
    initialize() {
        if (this.initialized) {
            logger_1.logger.debug('Google Cloud Storage client is already initialized.');
            return;
        }
        try {
            logger_1.logger.info('Initializing Google Cloud Storage client...');
            const projectId = process.env.GCS_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
            const keyFilename = process.env.GCS_KEY_FILE_PATH || process.env.FIREBASE_CREDENTIALS_PATH;
            const clientEmail = process.env.GCS_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.GCS_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
            const bucketName = process.env.GCS_BUCKET_NAME;
            if (!bucketName) {
                throw new Error('GCS_BUCKET_NAME configuration variable is required.');
            }
            const options = {};
            if (projectId) {
                options.projectId = projectId;
            }
            if (keyFilename) {
                logger_1.logger.info(`Using GCS credentials key file path: ${keyFilename}`);
                options.keyFilename = keyFilename;
            }
            else if (clientEmail && privateKey) {
                logger_1.logger.info('Using GCS credentials from environment configuration.');
                options.credentials = {
                    client_email: clientEmail,
                    private_key: privateKey.replace(/\\n/g, '\n'),
                };
            }
            else {
                logger_1.logger.info('No explicit GCS credentials provided. Falling back to Google Application Default Credentials.');
            }
            this.storageInstance = new storage_1.Storage(options);
            this.initialized = true;
            logger_1.logger.info('Google Cloud Storage client successfully initialized.');
        }
        catch (error) {
            const initError = new storage_errors_1.StorageInitializationError('Failed to initialize Google Cloud Storage Client.', error instanceof Error ? error : new Error(String(error)));
            logger_1.logger.error('Storage initialization error', initError);
            throw initError;
        }
    }
    /**
     * Retrieves the initialized Storage instance.
     */
    getStorage() {
        if (!this.initialized || !this.storageInstance) {
            this.initialize();
        }
        if (!this.storageInstance) {
            throw new storage_errors_1.StorageInitializationError('Storage instance is not available after initialization.');
        }
        return this.storageInstance;
    }
    /**
     * Retrieves the configured bucket name.
     */
    getBucketName() {
        const bucketName = process.env.GCS_BUCKET_NAME;
        if (!bucketName) {
            throw new storage_errors_1.StorageInitializationError('GCS_BUCKET_NAME is not configured.');
        }
        return bucketName;
    }
}
exports.GcsConnectionManager = GcsConnectionManager;
/**
 * Reusable storage client getter.
 */
const getStorageClient = () => {
    return GcsConnectionManager.getInstance().getStorage();
};
exports.getStorageClient = getStorageClient;
//# sourceMappingURL=storage.js.map