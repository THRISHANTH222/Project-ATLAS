import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { FirestoreInitializationError } from '../errors/firestore.errors';

export class FirebaseConnectionManager {
  private static instance: FirebaseConnectionManager;
  private dbInstance: admin.firestore.Firestore | null = null;
  private initialized = false;

  private constructor() {}

  /**
   * Returns the singleton instance of the connection manager.
   */
  public static getInstance(): FirebaseConnectionManager {
    if (!FirebaseConnectionManager.instance) {
      FirebaseConnectionManager.instance = new FirebaseConnectionManager();
    }
    return FirebaseConnectionManager.instance;
  }

  /**
   * Initializes the Firebase Admin SDK if not already initialized.
   */
  public initialize(): void {
    if (this.initialized) {
      logger.debug('Firebase Admin SDK is already initialized.');
      return;
    }

    try {
      logger.info('Initializing Firebase Admin SDK...');

      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH;

      // Check if there is an existing app instance to prevent duplicate app initialization
      if (admin.apps.length > 0) {
        logger.warn('Firebase App already exists. Reusing existing app instance.');
        this.dbInstance = admin.firestore();
        this.initialized = true;
        return;
      }

      let credentialOption: admin.credential.Credential;

      if (credentialsPath) {
        logger.info(`Loading credentials from service account JSON path: ${credentialsPath}`);
        credentialOption = admin.credential.cert(credentialsPath);
      } else if (projectId && clientEmail && privateKey) {
        logger.info('Loading credentials from explicit environment variables.');
        // Normalize any escaped newlines in the private key string
        const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
        credentialOption = admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        });
      } else {
        logger.info('No explicit credentials found. Falling back to Google Application Default Credentials.');
        credentialOption = admin.credential.applicationDefault();
      }

      admin.initializeApp({
        credential: credentialOption,
        projectId: projectId || undefined,
      });

      this.dbInstance = admin.firestore();
      
      // Ensure Firestore ignores undefined properties globally instead of throwing errors
      this.dbInstance.settings({
        ignoreUndefinedProperties: true,
      });

      this.initialized = true;
      logger.info('Firebase Admin SDK and Firestore successfully initialized.');
    } catch (error) {
      const initError = new FirestoreInitializationError(
        'Failed to initialize Firebase Admin SDK.',
        error instanceof Error ? error : new Error(String(error))
      );
      logger.error('Firebase initialization error', initError);
      throw initError;
    }
  }

  /**
   * Gets the Firestore database instance.
   * Initializes it if it has not been initialized yet.
   */
  public getFirestore(): admin.firestore.Firestore {
    if (!this.initialized || !this.dbInstance) {
      this.initialize();
    }
    if (!this.dbInstance) {
      throw new FirestoreInitializationError('Firestore instance is not available after initialization.');
    }
    return this.dbInstance;
  }
}

/**
 * Lazy getter for retrieving the database instance cleanly.
 */
export const getDb = (): admin.firestore.Firestore => {
  return FirebaseConnectionManager.getInstance().getFirestore();
};
