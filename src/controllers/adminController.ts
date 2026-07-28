import { Response } from 'express';
import mongoose from 'mongoose';
import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import { Review } from '../models/Review.js';
import { Notification } from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import type { AuthRequest } from '../types/index.js';
import { isDatabaseConnected } from '../config/db.js';
import { inMemoryProperties } from './propertyController.js';

export async function approveProperty(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!isDatabaseConnected || !mongoose.Types.ObjectId.isValid(id)) {
      const property = inMemoryProperties.find(p => p._id === id);
      if (!property) {
        sendError(res, 'Property not found', 404);
        return;
      }
      property.status = 'published';
      sendSuccess(res, { property }, 'Property approved and published in memory fallback');
      return;
    }

    const property = await Property.findById(id).populate('owner');

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if (property.status !== 'submitted' && property.status !== 'pending_review') {
      sendError(res, 'Property is not pending review', 400);
      return;
    }

    property.status = 'published';
    if (req.user?.userId && mongoose.Types.ObjectId.isValid(req.user.userId)) {
      property.reviewedBy = new mongoose.Types.ObjectId(req.user.userId);
    }
    property.reviewedAt = new Date();
    await property.save();

    const recipientId = (property.owner as any)?._id ?? property.owner;
    if (recipientId) {
      await Notification.create({
        recipient: recipientId,
        type: 'listing_approved',
        title: 'Listing Approved',
        message: `Your property "${property.title}" has been approved and is now published.`,
        metadata: { propertyId: property._id },
      });
    }

    sendSuccess(res, { property }, 'Property approved and published');
  } catch (error: any) {
    console.error('Error approving property:', error);
    sendError(res, error?.message || 'Failed to approve property', 500);
  }
}

export async function rejectProperty(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { feedback } = req.body;

    if (!feedback || feedback.trim().length < 10) {
      sendError(
        res,
        'Feedback is required and must be at least 10 characters',
        400
      );
      return;
    }

    if (!isDatabaseConnected || !mongoose.Types.ObjectId.isValid(id)) {
      const property = inMemoryProperties.find(p => p._id === id);
      if (!property) {
        sendError(res, 'Property not found', 404);
        return;
      }
      property.status = 'rejected';
      property.feedback = feedback.trim();
      sendSuccess(res, { property }, 'Property rejected in memory fallback');
      return;
    }

    const property = await Property.findById(id).populate('owner');

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if (property.status !== 'submitted' && property.status !== 'pending_review') {
      sendError(res, 'Property is not pending review', 400);
      return;
    }

    property.status = 'rejected';
    property.feedback = feedback.trim();
    property.feedbackProvidedAt = new Date();
    if (req.user?.userId && mongoose.Types.ObjectId.isValid(req.user.userId)) {
      property.reviewedBy = new mongoose.Types.ObjectId(req.user.userId);
    }
    property.reviewedAt = new Date();
    await property.save();

    const recipientId = (property.owner as any)?._id ?? property.owner;
    if (recipientId) {
      await Notification.create({
        recipient: recipientId,
        type: 'listing_rejected',
        title: 'Listing Rejected',
        message: `Your property "${property.title}" has been rejected. Please check the feedback and resubmit.`,
        metadata: {
          propertyId: property._id,
          feedback: feedback.trim(),
        },
      });
    }

    sendSuccess(res, { property }, 'Property rejected with feedback');
  } catch (error: any) {
    console.error('Error rejecting property:', error);
    sendError(res, error?.message || 'Failed to reject property', 500);
  }
}

export async function archiveProperty(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!isDatabaseConnected || !mongoose.Types.ObjectId.isValid(id)) {
      const property = inMemoryProperties.find(p => p._id === id);
      if (!property) {
        sendError(res, 'Property not found', 404);
        return;
      }
      property.status = 'archived';
      sendSuccess(res, { property }, 'Property archived in memory fallback');
      return;
    }

    const property = await Property.findByIdAndUpdate(
      id,
      { status: 'archived' },
      { new: true }
    );

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    sendSuccess(res, { property }, 'Property archived');
  } catch (error: any) {
    console.error('Error archiving property:', error);
    sendError(res, error?.message || 'Failed to archive property', 500);
  }
}

export async function getAdminDashboard(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!isDatabaseConnected) {
      sendSuccess(res, {
        totalListings: inMemoryProperties.length,
        pendingListings: inMemoryProperties.filter(p => p.status === 'submitted' || p.status === 'pending_review').length,
        approvedListings: inMemoryProperties.filter(p => p.status === 'approved' || p.status === 'published').length,
        rejectedListings: inMemoryProperties.filter(p => p.status === 'rejected').length,
        totalUsers: 3,
        totalReviews: 0,
      });
      return;
    }

    const [
      totalListings,
      pendingListings,
      approvedListings,
      rejectedListings,
      totalUsers,
      totalReviews,
    ] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ status: { $in: ['submitted', 'pending_review'] } }),
      Property.countDocuments({ status: { $in: ['approved', 'published'] } }),
      Property.countDocuments({ status: 'rejected' }),
      User.countDocuments(),
      Review.countDocuments(),
    ]);

    sendSuccess(res, {
      totalListings,
      pendingListings,
      approvedListings,
      rejectedListings,
      totalUsers,
      totalReviews,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch dashboard data', 500);
  }
}

export async function getUsers(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!isDatabaseConnected) {
      const mockUsers = [
        { _id: 'mock_u_admin', name: 'Admin User', email: 'admin@rentalisting.com', role: 'admin', isActive: true },
        { _id: 'mock_u_owner', name: 'Owner User', email: 'owner@rentalisting.com', role: 'owner', isActive: true },
        { _id: 'mock_u_visitor', name: 'Visitor User', email: 'visitor@rentalisting.com', role: 'visitor', isActive: true }
      ];
      res.status(200).json({
        success: true,
        data: mockUsers,
        pagination: {
          total: 3,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.role) filter.role = req.query.role;

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    sendError(res, 'Failed to fetch users', 500);
  }
}

export async function toggleUserStatus(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!isDatabaseConnected) {
      sendSuccess(
        res,
        {},
        'User status toggled in memory fallback'
      );
      return;
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    user.isActive = !user.isActive;
    await user.save();

    sendSuccess(
      res,
      { user },
      `User ${user.isActive ? 'activated' : 'deactivated'}`
    );
  } catch (error) {
    sendError(res, 'Failed to toggle user status', 500);
  }
}

export async function deleteUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.params.id;

    if (userId === req.user?.userId) {
      sendError(res, 'You cannot delete your own admin account', 400);
      return;
    }

    if (!isDatabaseConnected) {
      sendSuccess(res, null, 'User deleted successfully');
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    await Property.deleteMany({ owner: userId });
    await Review.deleteMany({ author: userId });
    await User.findByIdAndDelete(userId);

    sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    sendError(res, 'Failed to delete user', 500);
  }
}

