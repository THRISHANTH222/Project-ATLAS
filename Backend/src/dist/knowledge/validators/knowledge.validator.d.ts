import { z } from 'zod';
import { ProcessingStatus } from '../models/knowledge.types';
/**
 * Validation schema for registering new document metadata.
 */
export declare const CreateDocumentSchema: z.ZodObject<{
    filename: z.ZodString;
    originalFilename: z.ZodString;
    fileExtension: z.ZodString;
    mimeType: z.ZodString;
    storagePath: z.ZodString;
    parserUsed: z.ZodOptional<z.ZodString>;
    parserVersion: z.ZodOptional<z.ZodString>;
    totalPages: z.ZodNumber;
    totalCharacters: z.ZodNumber;
    totalWords: z.ZodNumber;
    totalChunks: z.ZodNumber;
    totalEmbeddings: z.ZodNumber;
    processingDuration: z.ZodOptional<z.ZodNumber>;
    checksum: z.ZodString;
    status: z.ZodNativeEnum<typeof ProcessingStatus>;
}, "strip", z.ZodTypeAny, {
    filename: string;
    status: ProcessingStatus;
    checksum: string;
    originalFilename: string;
    fileExtension: string;
    mimeType: string;
    storagePath: string;
    totalPages: number;
    totalCharacters: number;
    totalWords: number;
    totalChunks: number;
    totalEmbeddings: number;
    parserUsed?: string | undefined;
    parserVersion?: string | undefined;
    processingDuration?: number | undefined;
}, {
    filename: string;
    status: ProcessingStatus;
    checksum: string;
    originalFilename: string;
    fileExtension: string;
    mimeType: string;
    storagePath: string;
    totalPages: number;
    totalCharacters: number;
    totalWords: number;
    totalChunks: number;
    totalEmbeddings: number;
    parserUsed?: string | undefined;
    parserVersion?: string | undefined;
    processingDuration?: number | undefined;
}>;
/**
 * Validation schema for PATCH requests updating lifecycle status.
 */
export declare const UpdateStatusSchema: z.ZodObject<{
    status: z.ZodNativeEnum<typeof ProcessingStatus>;
    failureReason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: ProcessingStatus;
    failureReason?: string | undefined;
}, {
    status: ProcessingStatus;
    failureReason?: string | undefined;
}>;
/**
 * Validation schema for listing query pagination, filters, and sorting.
 */
export declare const ListDocumentsQuerySchema: z.ZodObject<{
    limit: z.ZodOptional<z.ZodEffects<z.ZodNumber, number, unknown>>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof ProcessingStatus>>;
    health: z.ZodOptional<z.ZodEnum<["Healthy", "Warning", "Error"]>>;
    searchFilename: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortDirection: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    status?: ProcessingStatus | undefined;
    limit?: number | undefined;
    health?: "Healthy" | "Warning" | "Error" | undefined;
    searchFilename?: string | undefined;
    sortBy?: string | undefined;
    sortDirection?: "desc" | "asc" | undefined;
}, {
    status?: ProcessingStatus | undefined;
    limit?: unknown;
    health?: "Healthy" | "Warning" | "Error" | undefined;
    searchFilename?: string | undefined;
    sortBy?: string | undefined;
    sortDirection?: "desc" | "asc" | undefined;
}>;
//# sourceMappingURL=knowledge.validator.d.ts.map