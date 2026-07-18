import { Response } from 'express';
import { Notification } from '../models/Notification.js';
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

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user!.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ recipient: req.user!.userId }),
      Notification.countDocuments({
        recipient: req.user!.userId,
        isRead: false,
      }),
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
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user!.userId,
      },
      { isRead: true },
      { new: true }
    );

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
    await Notification.updateMany(
      {
        recipient: req.user!.userId,
        isRead: false,
      },
      { isRead: true }
    );

    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    sendError(res, 'Failed to mark notifications as read', 500);
  }
}
