import { HealthStatus } from '../models/knowledge.types';
/**
 * Data Transfer Object containing calculated health status report metrics.
 */
export interface DocumentHealthReportDto {
    documentId: string;
    companyId: string;
    health: HealthStatus;
    issues: string[];
    checkedAt: string;
}
//# sourceMappingURL=document-health.dto.d.ts.map