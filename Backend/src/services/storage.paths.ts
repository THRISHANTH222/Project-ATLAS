/**
 * Utility class for generating and sanitizing consistent cloud storage folder structures.
 * Enforces companyId-based storage hierarchy.
 */
export class StoragePathGenerator {
  /**
   * Sanitizes a file name or path segment by removing forbidden characters,
   * replacing spaces with underscores, and trimming.
   * @param name File name or path segment.
   */
  public static sanitizeName(name: string): string {
    if (!name) return '';
    return name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove illegal path characters
      .replace(/\s+/g, '_')                  // Replace spaces with underscores
      .trim();
  }

  /**
   * Normalizes path slashes to forward slashes '/' (standard in GCS/cloud storage),
   * removes duplicate consecutive slashes, and trims leading/trailing slashes.
   * @param filePath File path string to normalize.
   */
  public static normalizePath(filePath: string): string {
    if (!filePath) return '';
    return filePath
      .replace(/\\/g, '/')         // Normalize windows backslashes to forward slashes
      .replace(/\/+/g, '/')       // Collapse multiple slashes (e.g. /// -> /)
      .replace(/^\/|\/$/g, '');   // Strip leading and trailing slashes
  }

  /**
   * Generates the root path for a company folder.
   * Format: companyId
   * @param companyId The identifier for the tenant company.
   */
  public static companyRoot(companyId: string): string {
    const cleanCompanyId = this.sanitizeName(companyId);
    if (!cleanCompanyId) {
      throw new Error('companyId must be a valid non-empty string.');
    }
    return this.normalizePath(cleanCompanyId);
  }

  /**
   * Generates a folder path under a company root.
   * Format: companyId/category
   * @param companyId The identifier for the tenant company.
   * @param category Storage category (e.g. 'attendance', 'students', 'faculty', 'reports', 'documents', 'uploads').
   */
  public static companyFolder(
    companyId: string, 
    category: 'attendance' | 'students' | 'faculty' | 'reports' | 'documents' | 'uploads' | string
  ): string {
    const root = this.companyRoot(companyId);
    const cleanCategory = this.normalizePath(this.sanitizeName(category));
    if (!cleanCategory) {
      throw new Error('category must be a valid non-empty string.');
    }
    return this.normalizePath(`${root}/${cleanCategory}`);
  }

  /**
   * Generates a fully qualified file storage path under a company and category folder.
   * Format: companyId/category/filename
   * @param companyId The identifier for the tenant company.
   * @param category Storage category.
   * @param filename Name of the file.
   */
  public static companyFilePath(
    companyId: string,
    category: 'attendance' | 'students' | 'faculty' | 'reports' | 'documents' | 'uploads' | string,
    filename: string
  ): string {
    const folder = this.companyFolder(companyId, category);
    const cleanFilename = this.normalizePath(this.sanitizeName(filename));
    if (!cleanFilename) {
      throw new Error('filename must be a valid non-empty string.');
    }
    return this.normalizePath(`${folder}/${cleanFilename}`);
  }
}
