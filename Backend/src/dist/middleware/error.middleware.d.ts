import { Request, Response, NextFunction } from 'express';
/**
 * Centralized error handling middleware.
 * Ensures the API never exposes internal stack traces to the client
 * while returning clean, structured error responses.
 */
export declare const errorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=error.middleware.d.ts.map