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
exports.FirestoreService = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_errors_1 = require("../errors/firestore.errors");
const logger_1 = require("../utils/logger");
const firebase_1 = require("../config/firebase");
/**
 * Generic Firestore service layer that abstracts all database interactions.
 * Works with any document shape extending Record<string, any>.
 */
class FirestoreService {
    collectionName;
    db;
    /**
     * Creates an instance of FirestoreService for a specific collection.
     * @param collectionName Name of the Firestore collection.
     */
    constructor(collectionName) {
        this.collectionName = collectionName;
        this.db = firebase_1.FirebaseConnectionManager.getInstance().getFirestore();
    }
    /**
     * Centralized method to map raw Firestore SDK errors to custom domain errors.
     */
    handleError(error, context) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStack = error instanceof Error ? error : new Error(errMsg);
        logger_1.logger.error(`Firestore operation failed: [Action: ${context?.action}] on [Collection: ${this.collectionName}]`, error, context);
        // Map common Firebase errors based on grpc status codes or error messages
        if (error.code === 5 || errMsg.includes('NOT_FOUND') || errMsg.includes('not found')) {
            return new firestore_errors_1.DocumentNotFoundError(this.collectionName, context?.docId || 'unknown', errStack);
        }
        if (error.code === 7 || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('permission denied')) {
            return new firestore_errors_1.PermissionDeniedError(`Permission denied: ${errMsg}`, errStack);
        }
        if (error.code === 3 || errMsg.includes('INVALID_ARGUMENT') || errMsg.includes('invalid argument')) {
            return new firestore_errors_1.InvalidDataError(`Invalid argument: ${errMsg}`, errStack);
        }
        if (error.code === 14 || errMsg.includes('UNAVAILABLE') || errMsg.includes('network')) {
            return new firestore_errors_1.NetworkFailureError(`Network failure: ${errMsg}`, errStack);
        }
        return new firestore_errors_1.FirestoreError(`Firestore error during ${context?.action}: ${errMsg}`, 'FIRESTORE_ERROR', errStack);
    }
    /**
     * Check if a document exists in the collection by its ID.
     * @param docId The ID of the document to check.
     * @returns A promise that resolves to true if the document exists, otherwise false.
     */
    async exists(docId) {
        try {
            logger_1.logger.debug(`Checking existence of document ${docId} in ${this.collectionName}`);
            const docRef = this.db.collection(this.collectionName).doc(docId);
            const snapshot = await docRef.get();
            return snapshot.exists;
        }
        catch (error) {
            throw this.handleError(error, { docId, action: 'exists' });
        }
    }
    /**
     * Retrieve a single document from the collection by its ID.
     * @param docId The ID of the document to retrieve.
     * @returns A promise that resolves to the typed document data including its id.
     * @throws DocumentNotFoundError if the document does not exist.
     */
    async getById(docId) {
        try {
            logger_1.logger.debug(`Getting document ${docId} from ${this.collectionName}`);
            const docRef = this.db.collection(this.collectionName).doc(docId);
            const snapshot = await docRef.get();
            if (!snapshot.exists) {
                throw new firestore_errors_1.DocumentNotFoundError(this.collectionName, docId);
            }
            return { id: snapshot.id, ...snapshot.data() };
        }
        catch (error) {
            if (error instanceof firestore_errors_1.DocumentNotFoundError)
                throw error;
            throw this.handleError(error, { docId, action: 'getById' });
        }
    }
    /**
     * Create a new document in the collection with an auto-generated ID.
     * Automatically sets createdAt and updatedAt timestamps.
     * @param data The document content (excluding the auto-generated id field).
     * @returns A promise resolving to the generated document ID and the created document model.
     */
    async create(data) {
        try {
            logger_1.logger.debug(`Creating auto-id document in ${this.collectionName}`);
            const docRef = this.db.collection(this.collectionName).doc();
            const timestamp = admin.firestore.FieldValue.serverTimestamp();
            const documentData = {
                ...data,
                createdAt: timestamp,
                updatedAt: timestamp,
            };
            await docRef.set(documentData);
            const createdData = { id: docRef.id, ...documentData };
            logger_1.logger.info(`Successfully created document ${docRef.id} in ${this.collectionName}`);
            return { id: docRef.id, data: createdData };
        }
        catch (error) {
            throw this.handleError(error, { action: 'create' });
        }
    }
    /**
     * Create or completely overwrite a document with a specified custom ID.
     * Automatically sets createdAt and updatedAt timestamps.
     * @param docId The custom ID to assign to the document.
     * @param data The document content (excluding the id field).
     * @returns A promise resolving to the created document model.
     */
    async createWithId(docId, data) {
        try {
            logger_1.logger.debug(`Creating document ${docId} in ${this.collectionName}`);
            const docRef = this.db.collection(this.collectionName).doc(docId);
            const timestamp = admin.firestore.FieldValue.serverTimestamp();
            const documentData = {
                ...data,
                createdAt: timestamp,
                updatedAt: timestamp,
            };
            await docRef.set(documentData, { merge: false });
            const createdData = { id: docId, ...documentData };
            logger_1.logger.info(`Successfully created document with ID ${docId} in ${this.collectionName}`);
            return createdData;
        }
        catch (error) {
            throw this.handleError(error, { docId, action: 'createWithId' });
        }
    }
    /**
     * Retrieve all documents from the collection.
     * Use with caution on large collections; prefer query/pagination.
     * @returns A promise resolving to an array of all typed documents.
     */
    async getAll() {
        try {
            logger_1.logger.debug(`Retrieving all documents from ${this.collectionName}`);
            const snapshot = await this.db.collection(this.collectionName).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        catch (error) {
            throw this.handleError(error, { action: 'getAll' });
        }
    }
    /**
     * Update fields of an existing document.
     * Automatically updates the updatedAt timestamp.
     * @param docId The ID of the document to update.
     * @param data Partial data containing fields to update.
     * @throws DocumentNotFoundError if the document does not exist.
     */
    async update(docId, data) {
        try {
            logger_1.logger.debug(`Updating document ${docId} in ${this.collectionName}`);
            const docRef = this.db.collection(this.collectionName).doc(docId);
            const updateData = {
                ...data,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            // Firestore update() fails if the document does not exist
            await docRef.update(updateData);
            logger_1.logger.info(`Successfully updated document ${docId} in ${this.collectionName}`);
        }
        catch (error) {
            throw this.handleError(error, { docId, action: 'update' });
        }
    }
    /**
     * Delete a document by its ID.
     * @param docId The ID of the document to delete.
     */
    async delete(docId) {
        try {
            logger_1.logger.debug(`Deleting document ${docId} from ${this.collectionName}`);
            const docRef = this.db.collection(this.collectionName).doc(docId);
            await docRef.delete();
            logger_1.logger.info(`Successfully deleted document ${docId} from ${this.collectionName}`);
        }
        catch (error) {
            throw this.handleError(error, { docId, action: 'delete' });
        }
    }
    /**
     * Query documents with custom filters, ordering, limits, and cursor pagination.
     * @param options Query parameters including filters list, ordering instructions, limits, and cursor snapshots.
     * @returns A promise resolving to a PaginationResult containing the data and last visible document snapshot.
     */
    async query(options = {}) {
        try {
            logger_1.logger.debug(`Executing query on ${this.collectionName}`, options);
            let query = this.db.collection(this.collectionName);
            // Apply query filters
            if (options.filters && options.filters.length > 0) {
                options.filters.forEach(filter => {
                    query = query.where(filter.field, filter.operator, filter.value);
                });
            }
            // Apply ordering rules
            if (options.orderBy && options.orderBy.length > 0) {
                options.orderBy.forEach(order => {
                    query = query.orderBy(order.field, order.direction || 'asc');
                });
            }
            // Apply pagination cursor offset
            if (options.startAfterDoc) {
                query = query.startAfter(options.startAfterDoc);
            }
            else if (options.startAtDoc) {
                query = query.startAt(options.startAtDoc);
            }
            // Apply page size limit
            if (options.limit !== undefined) {
                query = query.limit(options.limit);
            }
            const snapshot = await query.get();
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const lastVisibleSnapshot = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
            return {
                data,
                lastVisibleSnapshot,
            };
        }
        catch (error) {
            throw this.handleError(error, { action: 'query' });
        }
    }
    /**
     * Execute multiple operations atomically within a single transaction callback.
     * @param updateFunction User-defined transaction operations callback.
     * @returns The resolved transaction callback output value.
     * @throws TransactionError if transaction aborts or fails to commit.
     */
    async runTransaction(updateFunction) {
        try {
            logger_1.logger.info(`Starting transaction in ${this.collectionName}...`);
            const result = await this.db.runTransaction(async (transaction) => {
                return await updateFunction(transaction);
            });
            logger_1.logger.info('Transaction successfully committed.');
            return result;
        }
        catch (error) {
            const txError = new firestore_errors_1.TransactionError('Transaction failed to execute.', error instanceof Error ? error : new Error(String(error)));
            logger_1.logger.error('Transaction failure', txError);
            throw txError;
        }
    }
    /**
     * Executes a batch of writes (create, set, update, delete) atomically.
     * Limits maximum operations to 500 (Firestore service limits).
     * @param operations List of write operations to commit in the batch.
     * @throws BatchError if batch fails to execute or write is rejected.
     */
    async executeBatch(operations) {
        try {
            if (operations.length > 500) {
                throw new Error('Firestore batch writes cannot exceed 500 operations per call.');
            }
            logger_1.logger.info(`Starting batch write with ${operations.length} operations in ${this.collectionName}...`);
            const batch = this.db.batch();
            operations.forEach(op => {
                const docRef = this.db.collection(this.collectionName).doc(op.docId);
                const timestamp = admin.firestore.FieldValue.serverTimestamp();
                if (op.type === 'create') {
                    batch.set(docRef, { ...op.data, createdAt: timestamp, updatedAt: timestamp });
                }
                else if (op.type === 'set') {
                    batch.set(docRef, { ...op.data, updatedAt: timestamp }, { merge: true });
                }
                else if (op.type === 'update') {
                    batch.update(docRef, { ...op.data, updatedAt: timestamp });
                }
                else if (op.type === 'delete') {
                    batch.delete(docRef);
                }
            });
            await batch.commit();
            logger_1.logger.info('Batch write successfully committed.');
        }
        catch (error) {
            const batchError = new firestore_errors_1.BatchError('Batch write failed to execute.', error instanceof Error ? error : new Error(String(error)));
            logger_1.logger.error('Batch failure', batchError);
            throw batchError;
        }
    }
}
exports.FirestoreService = FirestoreService;
//# sourceMappingURL=firestore.service.js.map