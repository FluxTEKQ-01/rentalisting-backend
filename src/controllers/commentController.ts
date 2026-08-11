import { Request, Response } from 'express';
import { commentRepository } from '../repositories/commentRepository.js';
import { isDatabaseConnected } from '../config/db.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';

export async function createComment(req: Request, res: Response): Promise<void> {
  try {
    const { propertyId, name, email, address, comment } = req.body;

    if (!propertyId || !name || !email || !comment) {
      sendError(res, 'Property ID, name, email, and comment are required', 400);
      return;
    }

    if (!isDatabaseConnected) {
      sendSuccess(res, { comment: { _id: `mock_c_${Date.now()}`, propertyId, name, email, address, comment, createdAt: new Date() } }, 'Comment added', 201);
      return;
    }

    const newComment = await commentRepository.create({ property_id: propertyId, name, email, address: address || '', comment });
    sendSuccess(res, { comment: newComment }, 'Comment added successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to add comment', 500);
  }
}

export async function getComments(req: Request, res: Response): Promise<void> {
  try {
    const propertyId = req.params.propertyId as string;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const skip = (page - 1) * limit;

    if (!isDatabaseConnected) {
      sendPaginated(res, [], 0, page, limit);
      return;
    }

    const [comments, total] = await Promise.all([
      commentRepository.find(propertyId, { skip, limit }),
      commentRepository.countByProperty(propertyId),
    ]);

    sendPaginated(res, comments, total, page, limit);
  } catch (error) {
    sendError(res, 'Failed to fetch comments', 500);
  }
}
