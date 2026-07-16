import { z } from 'zod';
import { ProcessingStatus } from '../models/knowledge.types';

/**
 * Validation schema for registering new document metadata.
 */
export const CreateDocumentSchema = z.object({
  filename: z.string().min(1),
  originalFilename: z.string().min(1),
  fileExtension: z.string().min(1),
  mimeType: z.string().min(1),
  storagePath: z.string().min(1),
  parserUsed: z.string().optional(),
  parserVersion: z.string().optional(),
  totalPages: z.number().int().nonnegative(),
  totalCharacters: z.number().int().nonnegative(),
  totalWords: z.number().int().nonnegative(),
  totalChunks: z.number().int().nonnegative(),
  totalEmbeddings: z.number().int().nonnegative(),
  processingDuration: z.number().nonnegative().optional(),
  checksum: z.string().min(1),
  status: z.nativeEnum(ProcessingStatus),
});

/**
 * Validation schema for PATCH requests updating lifecycle status.
 */
export const UpdateStatusSchema = z.object({
  status: z.nativeEnum(ProcessingStatus),
  failureReason: z.string().optional(),
});

/**
 * Validation schema for listing query pagination, filters, and sorting.
 */
export const ListDocumentsQuerySchema = z.object({
  limit: z
    .preprocess((val) => (val ? parseInt(String(val), 10) : undefined), z.number().int().positive())
    .optional(),
  status: z.nativeEnum(ProcessingStatus).optional(),
  health: z.enum(['Healthy', 'Warning', 'Error']).optional(),
  searchFilename: z.string().optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});
