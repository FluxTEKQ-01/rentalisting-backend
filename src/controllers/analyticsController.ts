import { Response } from 'express';
import { propertyRepository } from '../repositories/propertyRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import type { AuthRequest } from '../types/index.js';

export async function getAnalytics(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    // Fetch all count data in parallel
    const [
      totalListings,
      publishedListings,
      pendingSubmitted,
      pendingReview,
      rejectedListings,
      totalUsers,
      ownerCount,
    ] = await Promise.all([
      propertyRepository.countDocuments(),
      propertyRepository.countByStatus('published'),
      propertyRepository.countByStatus('submitted'),
      propertyRepository.countByStatus('pending_review'),
      propertyRepository.countByStatus('rejected'),
      userRepository.countDocuments(),
      userRepository.countByRole('owner'),
    ]);

    // Fetch properties for grouping by type and date
    const allPublishedProperties = await propertyRepository.find({ status: 'published' });
    const recentProperties = await propertyRepository.find({});

    // Group by property type (published only)
    const typeMap: Record<string, number> = {};
    allPublishedProperties.forEach((prop) => {
      const type = prop.property_type;
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    const listingsByType = Object.entries(typeMap)
      .map(([type, count]) => ({ _id: type, count }))
      .sort((a, b) => b.count - a.count);

    // Group by date (properties from last 30 days)
    const dateMap: Record<string, number> = {};
    recentProperties.forEach((prop) => {
      const createdDate = new Date(prop.created_at);
      if (createdDate >= thirtyDaysAgo) {
        const dateStr = createdDate.toISOString().split('T')[0]; // YYYY-MM-DD
        dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
      }
    });
    const listingsOverTime = Object.entries(dateMap)
      .map(([date, count]) => ({ _id: date, count }))
      .sort((a, b) => a._id.localeCompare(b._id));

    const listingsThisMonth = recentProperties.filter(
      (p) => new Date(p.created_at) >= thirtyDaysAgo
    ).length;

    sendSuccess(res, {
      overview: {
        totalListings,
        publishedListings,
        pendingListings: pendingSubmitted + pendingReview,
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
