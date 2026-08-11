import { Response } from 'express';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';
import type { AuthRequest } from '../types/index.js';

export async function getNotifications(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const userId = req.user!.userId;

    const [notifications, total, unreadCount] = await Promise.all([
      notificationRepository.find(userId, { skip, limit }),
      notificationRepository.countByRecipient(userId),
      notificationRepository.countUnread(userId),
    ]);

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    sendError(res, 'Failed to fetch notifications', 500);
  }
}

export async function markAsRead(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;
    const notification = await notificationRepository.markAsRead(id);

    if (!notification) {
      sendError(res, 'Notification not found', 404);
      return;
    }

    sendSuccess(res, { notification }, 'Marked as read');
  } catch (error) {
    sendError(res, 'Failed to mark notification as read', 500);
  }
}

export async function markAllAsRead(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    await notificationRepository.markAllAsRead(userId);

    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    sendError(res, 'Failed to mark notifications as read', 500);
  }
}
