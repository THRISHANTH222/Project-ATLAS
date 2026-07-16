"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthStatus = exports.ProcessingStatus = void 0;
/**
 * Document processing lifecycle status states.
 */
var ProcessingStatus;
(function (ProcessingStatus) {
    ProcessingStatus["UPLOADED"] = "Uploaded";
    ProcessingStatus["PARSING"] = "Parsing";
    ProcessingStatus["PARSED"] = "Parsed";
    ProcessingStatus["CHUNKING"] = "Chunking";
    ProcessingStatus["CHUNKED"] = "Chunked";
    ProcessingStatus["EMBEDDING"] = "Embedding";
    ProcessingStatus["EMBEDDED"] = "Embedded";
    ProcessingStatus["INDEXING"] = "Indexing";
    ProcessingStatus["COMPLETED"] = "Completed";
    ProcessingStatus["FAILED"] = "Failed";
    ProcessingStatus["ARCHIVED"] = "Archived";
})(ProcessingStatus || (exports.ProcessingStatus = ProcessingStatus = {}));
/**
 * Health indicator metrics.
 */
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "Healthy";
    HealthStatus["WARNING"] = "Warning";
    HealthStatus["ERROR"] = "Error";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
//# sourceMappingURL=knowledge.types.js.map