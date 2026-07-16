import * as admin from 'firebase-admin';
export declare class FirebaseConnectionManager {
    private static instance;
    private dbInstance;
    private initialized;
    private constructor();
    /**
     * Returns the singleton instance of the connection manager.
     */
    static getInstance(): FirebaseConnectionManager;
    /**
     * Initializes the Firebase Admin SDK if not already initialized.
     */
    initialize(): void;
    /**
     * Gets the Firestore database instance.
     * Initializes it if it has not been initialized yet.
     */
    getFirestore(): admin.firestore.Firestore;
}
/**
 * Lazy getter for retrieving the database instance cleanly.
 */
export declare const getDb: () => admin.firestore.Firestore;
//# sourceMappingURL=firebase.d.ts.map