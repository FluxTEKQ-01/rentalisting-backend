import { Request } from 'express';

export type UserRole = 'visitor' | 'owner' | 'admin';

export type PropertyStatus =
  | 'draft'
  | 'submitted'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'archived';

export type PropertyCategory =
  | 'office'
  | 'shop_retail'
  | 'warehouse'
  | 'house_apartment'
  | 'apartment'
  | 'villa'
  | 'open_plot_land'
  | 'event_venue'
  | 'coworking'
  | 'commercial_building'
  | 'parking'
  | 'showroom'
  | 'industrial'
  | 'hotel_banquet'
  | 'shooting_location'
  | 'storage';

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
}

export interface PropertyQuery extends PaginationQuery {
  keyword?: string;
  location?: string;
  city?: string;
  propertyType?: PropertyCategory;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  bathrooms?: string;
  amenities?: string;
  minArea?: string;
  maxArea?: string;
  status?: PropertyStatus;
  owner?: string;
}
