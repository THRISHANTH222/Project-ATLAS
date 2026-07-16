import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Centralized error handling middleware.
 * Ensures the API never exposes internal stack traces to the client
 * while returning clean, structured error responses.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred.';

  // Securely log the error details with stack traces internally
  logger.error(`Error encountered in request [${req.method} ${req.originalUrl}] - Message: ${message}`, err);

  // Send a consistent JSON error payload to the client
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'An unexpected server error occurred.' : message,
    errors: err.errors || [
      {
        code: errorCode,
        message: statusCode === 500 ? 'Internal Server Error' : message,
      },
    ],
  });
};
