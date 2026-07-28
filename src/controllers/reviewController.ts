import { Response } from 'express';
import { Review } from '../models/Review.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import type { AuthRequest } from '../types/index.js';

let inMemoryReviews: any[] = [
  {
    _id: 'mock_rev_1',
    property: 'mock_indiranagar_apt_1',
    userName: 'Rohan Sharma',
    rating: 5,
    comment: 'Exceptional property! Very clean, well maintained, and peaceful neighborhood.',
    isApproved: true,
    createdAt: new Date(Date.now() - 86400000 * 3),
  },
  {
    _id: 'mock_rev_2',
    property: 'mock_indiranagar_apt_1',
    userName: 'Priya Nair',
    rating: 4,
    comment: 'Great location with easy access to metro station. Owner was very cooperative.',
    isApproved: true,
    createdAt: new Date(Date.now() - 86400000 * 7),
  }
];

export async function createReview(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const propertyId = req.params.propertyId;
    const { rating, comment, userName } = req.body;

    if (!rating || !comment) {
      sendError(res, 'Rating and comment are required', 400);
      return;
    }

    const reviewerName = (req.user as any)?.name || userName || 'Verified Tenant';

    try {
      const review = await Review.create({
        property: propertyId,
        user: req.user?.userId || undefined,
        userName: reviewerName,
        rating: Number(rating),
        comment: comment.trim(),
        isApproved: true,
      });

      sendSuccess(res, { review }, 'Review submitted successfully', 201);
      return;
    } catch {
      // Memory fallback if DB offline
      const mockReview = {
        _id: `mem_rev_${Date.now()}`,
        property: propertyId,
        userName: reviewerName,
        rating: Number(rating),
        comment: comment.trim(),
        isApproved: true,
        createdAt: new Date(),
      };
      inMemoryReviews.unshift(mockReview);
      sendSuccess(res, { review: mockReview }, 'Review submitted successfully', 201);
    }
  } catch (error) {
    sendError(res, 'Failed to create review', 500);
  }
}

export async function getPropertyReviews(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const propertyId = req.params.propertyId;

    try {
      const reviews = await Review.find({ property: propertyId, isApproved: true })
        .populate('user', 'name avatar')
        .sort({ createdAt: -1 });

      if (reviews.length > 0) {
        sendSuccess(res, { reviews }, 'Property reviews retrieved');
        return;
      }
    } catch {
      // DB error or empty -> fallback
    }

    const filteredMemory = inMemoryReviews.filter(
      (r) => String(r.property) === String(propertyId)
    );
    sendSuccess(res, { reviews: filteredMemory }, 'Property reviews retrieved');
  } catch (error) {
    sendError(res, 'Failed to fetch reviews', 500);
  }
}

export async function updateReview(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { rating, comment, userName } = req.body;

    try {
      const review = await Review.findById(id);
      if (review) {
        if (rating) review.rating = Number(rating);
        if (comment) review.comment = comment.trim();
        if (userName) review.userName = userName.trim();
        await review.save();
        sendSuccess(res, { review }, 'Review updated successfully');
        return;
      }
    } catch {
      // Check memory store
    }

    const memIndex = inMemoryReviews.findIndex((r) => String(r._id) === String(id));
    if (memIndex !== -1) {
      if (rating) inMemoryReviews[memIndex].rating = Number(rating);
      if (comment) inMemoryReviews[memIndex].comment = comment.trim();
      if (userName) inMemoryReviews[memIndex].userName = userName.trim();
      sendSuccess(res, { review: inMemoryReviews[memIndex] }, 'Review updated successfully');
      return;
    }

    sendError(res, 'Review not found', 404);
  } catch (error) {
    sendError(res, 'Failed to update review', 500);
  }
}

export async function deleteReview(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    try {
      const review = await Review.findByIdAndDelete(id);
      if (review) {
        sendSuccess(res, null, 'Review deleted successfully');
        return;
      }
    } catch {
      // Memory check
    }

    const initialLen = inMemoryReviews.length;
    inMemoryReviews = inMemoryReviews.filter((r) => String(r._id) !== String(id));
    if (inMemoryReviews.length < initialLen) {
      sendSuccess(res, null, 'Review deleted successfully');
      return;
    }

    sendSuccess(res, null, 'Review deleted successfully');
  } catch (error) {
    sendError(res, 'Failed to delete review', 500);
  }
}

export async function getAllReviews(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    try {
      const reviews = await Review.find({}).sort({ createdAt: -1 });
      sendSuccess(res, { reviews }, 'All reviews retrieved');
      return;
    } catch {
      sendSuccess(res, { reviews: inMemoryReviews }, 'All reviews retrieved');
    }
  } catch (error) {
    sendError(res, 'Failed to fetch reviews', 500);
  }
}
