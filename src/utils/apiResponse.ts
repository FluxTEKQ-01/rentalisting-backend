import { Response } from 'express';

export function sendSuccess(
  res: Response,
  data: unknown,
  message = 'Success',
  statusCode = 200
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message = 'Internal Server Error',
  statusCode = 500,
  errors?: unknown
): void {
  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

export function sendPaginated(
  res: Response,
  data: unknown[],
  total: number,
  page: number,
  limit: number
): void {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
