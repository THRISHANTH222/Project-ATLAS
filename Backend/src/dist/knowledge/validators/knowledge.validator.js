"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListDocumentsQuerySchema = exports.UpdateStatusSchema = exports.CreateDocumentSchema = void 0;
const zod_1 = require("zod");
const knowledge_types_1 = require("../models/knowledge.types");
/**
 * Validation schema for registering new document metadata.
 */
exports.CreateDocumentSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1),
    originalFilename: zod_1.z.string().min(1),
    fileExtension: zod_1.z.string().min(1),
    mimeType: zod_1.z.string().min(1),
    storagePath: zod_1.z.string().min(1),
    parserUsed: zod_1.z.string().optional(),
    parserVersion: zod_1.z.string().optional(),
    totalPages: zod_1.z.number().int().nonnegative(),
    totalCharacters: zod_1.z.number().int().nonnegative(),
    totalWords: zod_1.z.number().int().nonnegative(),
    totalChunks: zod_1.z.number().int().nonnegative(),
    totalEmbeddings: zod_1.z.number().int().nonnegative(),
    processingDuration: zod_1.z.number().nonnegative().optional(),
    checksum: zod_1.z.string().min(1),
    status: zod_1.z.nativeEnum(knowledge_types_1.ProcessingStatus),
});
/**
 * Validation schema for PATCH requests updating lifecycle status.
 */
exports.UpdateStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(knowledge_types_1.ProcessingStatus),
    failureReason: zod_1.z.string().optional(),
});
/**
 * Validation schema for listing query pagination, filters, and sorting.
 */
exports.ListDocumentsQuerySchema = zod_1.z.object({
    limit: zod_1.z
        .preprocess((val) => (val ? parseInt(String(val), 10) : undefined), zod_1.z.number().int().positive())
        .optional(),
    status: zod_1.z.nativeEnum(knowledge_types_1.ProcessingStatus).optional(),
    health: zod_1.z.enum(['Healthy', 'Warning', 'Error']).optional(),
    searchFilename: zod_1.z.string().optional(),
    sortBy: zod_1.z.string().optional(),
    sortDirection: zod_1.z.enum(['asc', 'desc']).optional(),
});
//# sourceMappingURL=knowledge.validator.js.map