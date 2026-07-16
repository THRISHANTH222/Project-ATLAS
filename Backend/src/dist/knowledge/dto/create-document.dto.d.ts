import { ProcessingStatus } from '../models/knowledge.types';
/**
 * Data Transfer Object for registering a processed document inside the catalog index.
 */
export interface CreateDocumentDto {
    filename: string;
    originalFilename: string;
    fileExtension: string;
    mimeType: string;
    storagePath: string;
    parserUsed?: string;
    parserVersion?: string;
    totalPages: number;
    totalCharacters: number;
    totalWords: number;
    totalChunks: number;
    totalEmbeddings: number;
    processingDuration?: number;
    checksum: string;
    status: ProcessingStatus;
}
//# sourceMappingURL=create-document.dto.d.ts.map