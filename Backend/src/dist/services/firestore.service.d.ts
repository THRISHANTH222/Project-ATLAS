import * as admin from 'firebase-admin';
import { QueryOptions, PaginationResult, BatchOperation } from './firestore.types';
/**
 * Generic Firestore service layer that abstracts all database interactions.
 * Works with any document shape extending Record<string, any>.
 */
export declare class FirestoreService<T extends Record<string, any>> {
    protected readonly collectionName: string;
    protected readonly db: admin.firestore.Firestore;
    /**
     * Creates an instance of FirestoreService for a specific collection.
     * @param collectionName Name of the Firestore collection.
     */
    constructor(collectionName: string);
    /**
     * Centralized method to map raw Firestore SDK errors to custom domain errors.
     */
    protected handleError(error: any, context?: {
        docId?: string;
        action: string;
    }): Error;
    /**
     * Check if a document exists in the collection by its ID.
     * @param docId The ID of the document to check.
     * @returns A promise that resolves to true if the document exists, otherwise false.
     */
    exists(docId: string): Promise<boolean>;
    /**
     * Retrieve a single document from the collection by its ID.
     * @param docId The ID of the document to retrieve.
     * @returns A promise that resolves to the typed document data including its id.
     * @throws DocumentNotFoundError if the document does not exist.
     */
    getById(docId: string): Promise<T>;
    /**
     * Create a new document in the collection with an auto-generated ID.
     * Automatically sets createdAt and updatedAt timestamps.
     * @param data The document content (excluding the auto-generated id field).
     * @returns A promise resolving to the generated document ID and the created document model.
     */
    create(data: Omit<T, 'id'>): Promise<{
        id: string;
        data: T;
    }>;
    /**
     * Create or completely overwrite a document with a specified custom ID.
     * Automatically sets createdAt and updatedAt timestamps.
     * @param docId The custom ID to assign to the document.
     * @param data The document content (excluding the id field).
     * @returns A promise resolving to the created document model.
     */
    createWithId(docId: string, data: Omit<T, 'id'>): Promise<T>;
    /**
     * Retrieve all documents from the collection.
     * Use with caution on large collections; prefer query/pagination.
     * @returns A promise resolving to an array of all typed documents.
     */
    getAll(): Promise<T[]>;
    /**
     * Update fields of an existing document.
     * Automatically updates the updatedAt timestamp.
     * @param docId The ID of the document to update.
     * @param data Partial data containing fields to update.
     * @throws DocumentNotFoundError if the document does not exist.
     */
    update(docId: string, data: Partial<T>): Promise<void>;
    /**
     * Delete a document by its ID.
     * @param docId The ID of the document to delete.
     */
    delete(docId: string): Promise<void>;
    /**
     * Query documents with custom filters, ordering, limits, and cursor pagination.
     * @param options Query parameters including filters list, ordering instructions, limits, and cursor snapshots.
     * @returns A promise resolving to a PaginationResult containing the data and last visible document snapshot.
     */
    query(options?: QueryOptions): Promise<PaginationResult<T>>;
    /**
     * Execute multiple operations atomically within a single transaction callback.
     * @param updateFunction User-defined transaction operations callback.
     * @returns The resolved transaction callback output value.
     * @throws TransactionError if transaction aborts or fails to commit.
     */
    runTransaction<R>(updateFunction: (transaction: admin.firestore.Transaction) => Promise<R>): Promise<R>;
    /**
     * Executes a batch of writes (create, set, update, delete) atomically.
     * Limits maximum operations to 500 (Firestore service limits).
     * @param operations List of write operations to commit in the batch.
     * @throws BatchError if batch fails to execute or write is rejected.
     */
    executeBatch(operations: Array<BatchOperation<T>>): Promise<void>;
}
//# sourceMappingURL=firestore.service.d.ts.map