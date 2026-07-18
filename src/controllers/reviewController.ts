import { Response } from 'express';
import { Review } from '../models/Review.js';
import { Property } from '../models/Property.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';
import type { AuthRequest } from '../types/index.js';

export async function createReview(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const propertyId = req.params.propertyId;

    const property = await Property.findById(propertyId);
    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if (property.status !== 'published') {
      sendError(res, 'Cannot review unpublished property', 400);
      return;
    }

    const existingReview = await Review.findOne({
      property: propertyId,
      user: req.user!.userId,
    });

    if (existingReview) {
      sendError(res, 'You have already reviewed this property', 409);
      return;
    }

    const review = await Review.create({
      property: propertyId,
      user: req.user!.userId,
      rating: req.body.rating,
      comment: req.body.comment,
    });

    const populated = await review.populate('user', 'name avatar');

    sendSuccess(res, { review: populated }, 'Review submitted', 201);
  } catch (error) {
    sendError(res, 'Failed to create review', 500);
  }
}

export async function getPropertyReviews(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      property: req.params.propertyId,
    };

    if (req.user?.role !== 'admin') {
      filter.isApproved = true;
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    sendPaginated(res, reviews, total, page, limit);
  } catch (error) {
    sendError(res, 'Failed to fetch reviews', 500);
  }
}

export async function getAllReviews(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({})
        .populate('user', 'name avatar')
        .populate('property', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({}),
    ]);

    sendPaginated(res, reviews, total, page, limit);
  } catch (error) {
    sendError(res, 'Failed to fetch reviews', 500);
  }
}

export async function deleteReview(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      sendError(res, 'Review not found', 404);
      return;
    }

    if (req.user!.role !== 'admin' && (review.user?._id?.toString() ?? review.user?.toString()) !== req.user!.userId) {
      sendError(res, 'Not authorized', 403);
      return;
    }

    await Review.findByIdAndDelete(req.params.id);
    sendSuccess(res, null, 'Review deleted');
  } catch (error) {
    sendError(res, 'Failed to delete review', 500);
  }
}
