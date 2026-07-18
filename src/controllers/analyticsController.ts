import { Response } from 'express';
import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import type { AuthRequest } from '../types/index.js';

export async function getAnalytics(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalListings,
      publishedListings,
      pendingListings,
      rejectedListings,
      totalUsers,
      ownerCount,
      listingsThisMonth,
      listingsByType,
    ] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ status: 'published' }),
      Property.countDocuments({ status: { $in: ['submitted', 'pending_review'] } }),
      Property.countDocuments({ status: 'rejected' }),
      User.countDocuments(),
      User.countDocuments({ role: 'owner' }),
      Property.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      }),
      Property.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$propertyType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const listingsOverTime = await Property.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    sendSuccess(res, {
      overview: {
        totalListings,
        publishedListings,
        pendingListings,
        rejectedListings,
        totalUsers,
        ownerCount,
        listingsThisMonth,
      },
      listingsByType,
      listingsOverTime,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch analytics', 500);
  }
}
