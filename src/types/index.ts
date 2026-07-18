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
  | 'apartment'
  | 'house'
  | 'villa'
  | 'commercial'
  | 'office'
  | 'land'
  | 'pg_hostel';

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
