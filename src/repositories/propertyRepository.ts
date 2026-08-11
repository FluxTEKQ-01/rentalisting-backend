import { supabaseClient } from '../config/supabase.js';
import { slugify, isUUID } from '../utils/slug.js';

// Repository for property listing operations against Supabase
// Mirrors the interface of the Mongoose Property model

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  public_id: string;
  sort_order: number;
  created_at: string;
}

export interface PropertyDoc {
  id: string;
  title: string;
  description: string;
  property_type: string;
  price: number;
  max_price?: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  max_area?: number;
  area_unit: string;
  amenities: string[];
  video_url: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  lat: number;
  lng: number;
  owner_id: string;
  slug: string;
  status: string;
  feedback: string;
  feedback_provided_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  search_vector?: any;
  created_at: string;
  updated_at: string;
  images?: PropertyImage[];
  owner?: any;
}

export interface CreatePropertyInput {
  title: string;
  description: string;
  propertyType: string;
  price: number;
  maxPrice?: number;
  currency?: string;
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  maxArea?: number;
  areaUnit?: string;
  amenities?: string[];
  videoUrl?: string;
  address?: string;
  city: string;
  state?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  owner_id: string;
  images?: Array<{ url: string; publicId: string }>;
}

export interface UpdatePropertyInput {
  title?: string;
  description?: string;
  propertyType?: string;
  price?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  maxArea?: number;
  amenities?: string[];
  videoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  status?: string;
  feedback?: string;
  feedbackProvidedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export const propertyRepository = {
  // Find properties with filters, pagination, and sorting
  async find(options?: {
    status?: string;
    city?: string;
    propertyType?: string;
    priceMin?: number;
    priceMax?: number;
    owner_id?: string;
    skip?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<PropertyDoc[]> {
    let query = supabaseClient.from('properties').select('*');

    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.city) {
      query = query.eq('city', options.city);
    }
    if (options?.propertyType) {
      query = query.eq('property_type', options.propertyType);
    }
    if (options?.priceMin !== undefined) {
      query = query.gte('price', options.priceMin);
    }
    if (options?.priceMax !== undefined) {
      query = query.lte('price', options.priceMax);
    }
    if (options?.owner_id) {
      query = query.eq('owner_id', options.owner_id);
    }

    // Sorting
    const sortBy = options?.sort || 'created_at';
    const sortOrder = options?.order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const skip = options?.skip || 0;
    const limit = options?.limit || 12;
    query = query.range(skip, skip + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as PropertyDoc[];
  },

  // Find property by ID with optional relations
  async findById(id: string, includeImages = true): Promise<PropertyDoc | null> {
    const { data, error } = await supabaseClient
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const property = data as PropertyDoc;

    // Fetch images if requested
    if (includeImages) {
      const { data: images } = await supabaseClient
        .from('property_images')
        .select('*')
        .eq('property_id', id)
        .order('sort_order', { ascending: true });

      property.images = (images || []) as PropertyImage[];
    }

    return property;
  },

  // Full-text search on title and description
  async search(query: string, options?: { skip?: number; limit?: number }): Promise<PropertyDoc[]> {
    const skip = options?.skip || 0;
    const limit = options?.limit || 12;

    const { data, error } = await supabaseClient
      .from('properties')
      .select('*')
      .textSearch('search_vector', query, { type: 'websearch' })
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) throw error;
    return (data || []) as PropertyDoc[];
  },

  // Create a new property
  async create(input: CreatePropertyInput): Promise<PropertyDoc> {
    // Generate unique slug from title
    const slug = await this.generateUniqueSlug(input.title);

    const { data, error } = await supabaseClient
      .from('properties')
      .insert({
        title: input.title,
        description: input.description,
        property_type: input.propertyType,
        price: input.price,
        max_price: input.maxPrice,
        currency: input.currency || 'INR',
        bedrooms: input.bedrooms || 0,
        bathrooms: input.bathrooms || 0,
        area: input.area,
        max_area: input.maxArea,
        area_unit: input.areaUnit || 'sqft',
        amenities: input.amenities || [],
        video_url: input.videoUrl || '',
        address: input.address || '',
        city: input.city,
        state: input.state || '',
        zip_code: input.zipCode || '',
        lat: input.lat || 0,
        lng: input.lng || 0,
        owner_id: input.owner_id,
        slug,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    const property = data as PropertyDoc;

    // Insert images if provided
    if (input.images && input.images.length > 0) {
      const imagesToInsert = input.images.map((img, idx) => ({
        property_id: property.id,
        url: img.url,
        public_id: img.publicId,
        sort_order: idx,
      }));

      const { error: imgError } = await supabaseClient
        .from('property_images')
        .insert(imagesToInsert);

      if (imgError) throw imgError;
      property.images = imagesToInsert as PropertyImage[];
    }

    return property;
  },

  // Update property fields
  async findByIdAndUpdate(id: string, updates: UpdatePropertyInput): Promise<PropertyDoc | null> {
    const updatePayload: any = {};
    if (updates.title) updatePayload.title = updates.title;
    if (updates.description) updatePayload.description = updates.description;
    if (updates.propertyType) updatePayload.property_type = updates.propertyType;
    if (updates.price !== undefined) updatePayload.price = updates.price;
    if (updates.maxPrice !== undefined) updatePayload.max_price = updates.maxPrice;
    if (updates.bedrooms !== undefined) updatePayload.bedrooms = updates.bedrooms;
    if (updates.bathrooms !== undefined) updatePayload.bathrooms = updates.bathrooms;
    if (updates.area !== undefined) updatePayload.area = updates.area;
    if (updates.maxArea !== undefined) updatePayload.max_area = updates.maxArea;
    if (updates.amenities) updatePayload.amenities = updates.amenities;
    if (updates.videoUrl !== undefined) updatePayload.video_url = updates.videoUrl;
    if (updates.address !== undefined) updatePayload.address = updates.address;
    if (updates.city) updatePayload.city = updates.city;
    if (updates.state !== undefined) updatePayload.state = updates.state;
    if (updates.zipCode !== undefined) updatePayload.zip_code = updates.zipCode;
    if (updates.lat !== undefined) updatePayload.lat = updates.lat;
    if (updates.lng !== undefined) updatePayload.lng = updates.lng;
    if (updates.status) updatePayload.status = updates.status;
    if (updates.feedback !== undefined) updatePayload.feedback = updates.feedback;
    if (updates.feedbackProvidedAt !== undefined) updatePayload.feedback_provided_at = updates.feedbackProvidedAt;
    if (updates.reviewedBy !== undefined) updatePayload.reviewed_by = updates.reviewedBy;
    if (updates.reviewedAt !== undefined) updatePayload.reviewed_at = updates.reviewedAt;

    const { data, error } = await supabaseClient
      .from('properties')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as PropertyDoc;
  },

  // Update property status (for workflow)
  async updateStatus(id: string, status: string, feedback?: string, reviewedBy?: string): Promise<PropertyDoc | null> {
    const updatePayload: any = { status };
    if (feedback !== undefined) updatePayload.feedback = feedback;
    if (reviewedBy) updatePayload.reviewed_by = reviewedBy;
    if (status !== 'draft') updatePayload.reviewed_at = new Date().toISOString();

    return this.findByIdAndUpdate(id, updatePayload);
  },

  // Delete property (cascades to images via FK)
  async findByIdAndDelete(id: string): Promise<PropertyDoc | null> {
    const { data, error } = await supabaseClient
      .from('properties')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as PropertyDoc;
  },

  // Count properties
  async countDocuments(filters?: { status?: string; owner_id?: string }): Promise<number> {
    let query = supabaseClient
      .from('properties')
      .select('*', { count: 'exact', head: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  },

  // Get property count by status
  async countByStatus(status: string): Promise<number> {
    const { count, error } = await supabaseClient
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);

    if (error) throw error;
    return count || 0;
  },

  // Add image to existing property
  async addImage(propertyId: string, url: string, publicId: string, sortOrder: number = 0): Promise<PropertyImage> {
    const { data, error } = await supabaseClient
      .from('property_images')
      .insert({
        property_id: propertyId,
        url,
        public_id: publicId,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PropertyImage;
  },

  // Remove image from property
  async removeImage(imageId: string): Promise<void> {
    const { error } = await supabaseClient
      .from('property_images')
      .delete()
      .eq('id', imageId);

    if (error) throw error;
  },

  // Get all images for a property
  async getImages(propertyId: string): Promise<PropertyImage[]> {
    const { data, error } = await supabaseClient
      .from('property_images')
      .select('*')
      .eq('property_id', propertyId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []) as PropertyImage[];
  },

  // Count properties by owner
  async countByOwner(ownerId: string, status?: string): Promise<number> {
    let query = supabaseClient
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ownerId);

    if (status) {
      query = query.eq('status', status);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  },

  // Generate a unique slug from title (with retry on collision)
  async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let attempt = 1;

    while (attempt < 100) {
      const { data, error } = await supabaseClient
        .from('properties')
        .select('id')
        .eq('slug', slug)
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data || data.length === 0) {
        return slug; // Slug is unique
      }

      // Slug exists, append suffix and retry
      slug = `${baseSlug}-${attempt}`;
      attempt++;
    }

    throw new Error(`Could not generate unique slug for title: ${title}`);
  },

  // Find property by UUID or slug (backward-compatible)
  async findByIdOrSlug(identifier: string, includeImages = true): Promise<PropertyDoc | null> {
    let query = supabaseClient
      .from('properties')
      .select('*');

    if (isUUID(identifier)) {
      query = query.eq('id', identifier);
    } else {
      query = query.eq('slug', identifier);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const property = data as PropertyDoc;

    // Fetch images if requested
    if (includeImages) {
      const { data: images } = await supabaseClient
        .from('property_images')
        .select('*')
        .eq('property_id', property.id)
        .order('sort_order', { ascending: true });

      property.images = (images || []) as PropertyImage[];
    }

    return property;
  },

};
