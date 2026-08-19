import { Response } from 'express';
import { propertyRepository } from '../repositories/propertyRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { reviewRepository } from '../repositories/reviewRepository.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { serializeProperty } from '../utils/serializers.js';
import type { AuthRequest } from '../types/index.js';
import { isDatabaseConnected } from '../config/db.js';
import { inMemoryProperties } from './propertyController.js';

export async function approveProperty(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!isDatabaseConnected) {
      const property = inMemoryProperties.find(p => p._id === id);
      if (!property) {
        sendError(res, 'Property not found', 404);
        return;
      }
      property.status = 'published';
      sendSuccess(res, { property }, 'Property approved and published in memory fallback');
      return;
    }

    const property = await propertyRepository.findById(id);

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    // Admin has authority to approve/publish listing from any state

    const updated = await propertyRepository.findByIdAndUpdate(id, {
      status: 'published',
      reviewedBy: req.user?.userId,
      reviewedAt: new Date().toISOString(),
    });

    if (!updated) {
      sendError(res, 'Failed to update property', 500);
      return;
    }

    if (property.owner_id) {
      await notificationRepository.create({
        recipient_id: property.owner_id,
        type: 'listing_approved',
        title: 'Listing Approved',
        message: `Your property "${updated.title}" has been approved and is now published.`,
        metadata: { propertyId: updated.id },
      });
    }

    sendSuccess(res, { property: serializeProperty(updated) }, 'Property approved and published');
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

    if (!isDatabaseConnected) {
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

    const property = await propertyRepository.findById(id);

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    // Admin has authority to reject listing from any state

    const updated = await propertyRepository.findByIdAndUpdate(id, {
      status: 'rejected',
      feedback: feedback.trim(),
      feedbackProvidedAt: new Date().toISOString(),
      reviewedBy: req.user?.userId,
      reviewedAt: new Date().toISOString(),
    });

    if (!updated) {
      sendError(res, 'Failed to update property', 500);
      return;
    }

    if (property.owner_id) {
      await notificationRepository.create({
        recipient_id: property.owner_id,
        type: 'listing_rejected',
        title: 'Listing Rejected',
        message: `Your property "${updated.title}" has been rejected. Please check the feedback and resubmit.`,
        metadata: {
          propertyId: updated.id,
          feedback: feedback.trim(),
        },
      });
    }

    sendSuccess(res, { property: serializeProperty(updated) }, 'Property rejected with feedback');
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
    if (!isDatabaseConnected) {
      const property = inMemoryProperties.find(p => p._id === id);
      if (!property) {
        sendError(res, 'Property not found', 404);
        return;
      }
      property.status = 'archived';
      sendSuccess(res, { property }, 'Property archived in memory fallback');
      return;
    }

    const property = await propertyRepository.findByIdAndUpdate(id, { status: 'archived' });

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    sendSuccess(res, { property: serializeProperty(property) }, 'Property archived');
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
      propertyRepository.countDocuments(),
      Promise.all([
        propertyRepository.countByStatus('submitted'),
        propertyRepository.countByStatus('pending_review'),
      ]).then(([a, b]) => a + b),
      Promise.all([
        propertyRepository.countByStatus('approved'),
        propertyRepository.countByStatus('published'),
      ]).then(([a, b]) => a + b),
      propertyRepository.countByStatus('rejected'),
      userRepository.countDocuments(),
      reviewRepository.countDocuments(),
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

    let users: any[] = [];
    let total = 0;

    const role = req.query.role as string | undefined;
    if (role && ['admin', 'owner', 'visitor'].includes(role)) {
      users = await userRepository.findByRole(role as any);
      total = users.length;
      users = users.slice(skip, skip + limit);
    } else {
      users = await userRepository.find();
      total = users.length;
      users = users.slice(skip, skip + limit);
    }

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

    const id = req.params.id as string;
    const user = await userRepository.toggleStatus(id);

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(
      res,
      { user },
      `User ${user.is_active ? 'activated' : 'deactivated'}`
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
    const userId = req.params.id as string;

    if (userId === req.user?.userId) {
      sendError(res, 'You cannot delete your own admin account', 400);
      return;
    }

    if (!isDatabaseConnected) {
      sendSuccess(res, null, 'User deleted successfully');
      return;
    }

    const user = await userRepository.findById(userId);

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Delete user (cascading deletes will handle related records via FK constraints)
    await userRepository.findByIdAndDelete(userId);

    sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    sendError(res, 'Failed to delete user', 500);
  }
}

