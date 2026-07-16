import { Storage } from '@google-cloud/storage';
import { logger } from '../utils/logger';
import { StorageInitializationError } from '../errors/storage.errors';

/**
 * Singleton connection manager for Google Cloud Storage.
 * Configures credentials and initializes the client only once.
 */
export class GcsConnectionManager {
  private static instance: GcsConnectionManager;
  private storageInstance: Storage | null = null;
  private initialized = false;

  private constructor() {}

  /**
   * Returns the singleton instance of the storage connection manager.
   */
  public static getInstance(): GcsConnectionManager {
    if (!GcsConnectionManager.instance) {
      GcsConnectionManager.instance = new GcsConnectionManager();
    }
    return GcsConnectionManager.instance;
  }

  /**
   * Initializes the Google Cloud Storage client.
   * Reads from environment configuration.
   */
  public initialize(): void {
    if (this.initialized) {
      logger.debug('Google Cloud Storage client is already initialized.');
      return;
    }

    try {
      logger.info('Initializing Google Cloud Storage client...');

      const projectId = process.env.GCS_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
      const keyFilename = process.env.GCS_KEY_FILE_PATH || process.env.FIREBASE_CREDENTIALS_PATH;
      const clientEmail = process.env.GCS_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.GCS_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
      const bucketName = process.env.GCS_BUCKET_NAME;

      if (!bucketName) {
        throw new Error('GCS_BUCKET_NAME configuration variable is required.');
      }

      const options: any = {};

      if (projectId) {
        options.projectId = projectId;
      }

      if (keyFilename) {
        logger.info(`Using GCS credentials key file path: ${keyFilename}`);
        options.keyFilename = keyFilename;
      } else if (clientEmail && privateKey) {
        logger.info('Using GCS credentials from environment configuration.');
        options.credentials = {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        };
      } else {
        logger.info('No explicit GCS credentials provided. Falling back to Google Application Default Credentials.');
      }

      this.storageInstance = new Storage(options);
      this.initialized = true;
      logger.info('Google Cloud Storage client successfully initialized.');
    } catch (error) {
      const initError = new StorageInitializationError(
        'Failed to initialize Google Cloud Storage Client.',
        error instanceof Error ? error : new Error(String(error))
      );
      logger.error('Storage initialization error', initError);
      throw initError;
    }
  }

  /**
   * Retrieves the initialized Storage instance.
   */
  public getStorage(): Storage {
    if (!this.initialized || !this.storageInstance) {
      this.initialize();
    }
    if (!this.storageInstance) {
      throw new StorageInitializationError('Storage instance is not available after initialization.');
    }
    return this.storageInstance;
  }

  /**
   * Retrieves the configured bucket name.
   */
  public getBucketName(): string {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      throw new StorageInitializationError('GCS_BUCKET_NAME is not configured.');
    }
    return bucketName;
  }
}

/**
 * Reusable storage client getter.
 */
export const getStorageClient = (): Storage => {
  return GcsConnectionManager.getInstance().getStorage();
};
