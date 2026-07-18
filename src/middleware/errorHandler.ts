import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled error:', err);

  if (err.name === 'CastError') {
    sendError(res, 'Invalid ID format', 400);
    return;
  }

  if (err.name === 'ValidationError') {
    sendError(res, err.message, 400);
    return;
  }

  if ((err as any).code === 11000) {
    sendError(res, 'Duplicate field value', 409);
    return;
  }

  sendError(res, 'Internal server error', 500);
}

export function notFound(_req: Request, res: Response): void {
  sendError(res, 'Route not found', 404);
}
