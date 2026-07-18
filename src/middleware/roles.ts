import { Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.js';
import type { AuthRequest, UserRole } from '../types/index.js';

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'Forbidden. Insufficient permissions', 403);
      return;
    }

    next();
  };
}
