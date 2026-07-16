/**
 * Utility class for generating and sanitizing consistent cloud storage folder structures.
 * Enforces companyId-based storage hierarchy.
 */
export declare class StoragePathGenerator {
    /**
     * Sanitizes a file name or path segment by removing forbidden characters,
     * replacing spaces with underscores, and trimming.
     * @param name File name or path segment.
     */
    static sanitizeName(name: string): string;
    /**
     * Normalizes path slashes to forward slashes '/' (standard in GCS/cloud storage),
     * removes duplicate consecutive slashes, and trims leading/trailing slashes.
     * @param filePath File path string to normalize.
     */
    static normalizePath(filePath: string): string;
    /**
     * Generates the root path for a company folder.
     * Format: companyId
     * @param companyId The identifier for the tenant company.
     */
    static companyRoot(companyId: string): string;
    /**
     * Generates a folder path under a company root.
     * Format: companyId/category
     * @param companyId The identifier for the tenant company.
     * @param category Storage category (e.g. 'attendance', 'students', 'faculty', 'reports', 'documents', 'uploads').
     */
    static companyFolder(companyId: string, category: 'attendance' | 'students' | 'faculty' | 'reports' | 'documents' | 'uploads' | string): string;
    /**
     * Generates a fully qualified file storage path under a company and category folder.
     * Format: companyId/category/filename
     * @param companyId The identifier for the tenant company.
     * @param category Storage category.
     * @param filename Name of the file.
     */
    static companyFilePath(companyId: string, category: 'attendance' | 'students' | 'faculty' | 'reports' | 'documents' | 'uploads' | string, filename: string): string;
}
//# sourceMappingURL=storage.paths.d.ts.map