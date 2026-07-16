"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = exports.FirebaseConnectionManager = void 0;
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const firestore_errors_1 = require("../errors/firestore.errors");
class FirebaseConnectionManager {
    static instance;
    dbInstance = null;
    initialized = false;
    constructor() { }
    /**
     * Returns the singleton instance of the connection manager.
     */
    static getInstance() {
        if (!FirebaseConnectionManager.instance) {
            FirebaseConnectionManager.instance = new FirebaseConnectionManager();
        }
        return FirebaseConnectionManager.instance;
    }
    /**
     * Initializes the Firebase Admin SDK if not already initialized.
     */
    initialize() {
        if (this.initialized) {
            logger_1.logger.debug('Firebase Admin SDK is already initialized.');
            return;
        }
        try {
            logger_1.logger.info('Initializing Firebase Admin SDK...');
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;
            const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH;
            // Check if there is an existing app instance to prevent duplicate app initialization
            if (admin.apps.length > 0) {
                logger_1.logger.warn('Firebase App already exists. Reusing existing app instance.');
                this.dbInstance = admin.firestore();
                this.initialized = true;
                return;
            }
            let credentialOption;
            if (credentialsPath) {
                logger_1.logger.info(`Loading credentials from service account JSON path: ${credentialsPath}`);
                credentialOption = admin.credential.cert(credentialsPath);
            }
            else if (projectId && clientEmail && privateKey) {
                logger_1.logger.info('Loading credentials from explicit environment variables.');
                // Normalize any escaped newlines in the private key string
                const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
                credentialOption = admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey: formattedPrivateKey,
                });
            }
            else {
                logger_1.logger.info('No explicit credentials found. Falling back to Google Application Default Credentials.');
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
            logger_1.logger.info('Firebase Admin SDK and Firestore successfully initialized.');
        }
        catch (error) {
            const initError = new firestore_errors_1.FirestoreInitializationError('Failed to initialize Firebase Admin SDK.', error instanceof Error ? error : new Error(String(error)));
            logger_1.logger.error('Firebase initialization error', initError);
            throw initError;
        }
    }
    /**
     * Gets the Firestore database instance.
     * Initializes it if it has not been initialized yet.
     */
    getFirestore() {
        if (!this.initialized || !this.dbInstance) {
            this.initialize();
        }
        if (!this.dbInstance) {
            throw new firestore_errors_1.FirestoreInitializationError('Firestore instance is not available after initialization.');
        }
        return this.dbInstance;
    }
}
exports.FirebaseConnectionManager = FirebaseConnectionManager;
/**
 * Lazy getter for retrieving the database instance cleanly.
 */
const getDb = () => {
    return FirebaseConnectionManager.getInstance().getFirestore();
};
exports.getDb = getDb;
//# sourceMappingURL=firebase.js.map