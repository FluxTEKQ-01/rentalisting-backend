import { supabaseClient } from '../config/supabase.js';
import { slugify, isUUID } from '../utils/slug.js';

// Postgres error code for "undefined column". The `slug` column arrives via
// docs/migration/06-add-property-slugs.sql; until that has been applied to a
// given environment we fall back to UUID-only behaviour rather than 500ing.
const UNDEFINED_COLUMN = '42703';

let slugColumnAvailable: boolean | null = null;

function noteSlugColumnMissing(error: any): boolean {
  if (error?.code !== UNDEFINED_COLUMN || !String(error?.message || '').includes('slug')) {
    return false;
  }
  if (slugColumnAvailable !== false) {
    console.warn(
      'properties.slug is missing — run docs/migration/06-add-property-slugs.sql. ' +
        'Falling back to UUID-only property URLs until then.'
    );
  }
  slugColumnAvailable = false;
  return true;
}

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
  status?: string;
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
    status?: string | string[];
    city?: string;
    propertyType?: string | string[];
    priceMin?: number;
    priceMax?: number;
    owner_id?: string;
    bedrooms?: number;
    bathrooms?: number;
    areaMin?: number;
    areaMax?: number;
    keyword?: string;
    amenities?: string[];
    skip?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<PropertyDoc[]> {
    let query = supabaseClient.from('properties').select('*');

    if (options?.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status);
      } else {
        query = query.eq('status', options.status);
      }
    }
    if (options?.city) {
      query = query.ilike('city', `%${options.city}%`);
    }
    if (options?.propertyType) {
      if (Array.isArray(options.propertyType)) {
        query = query.in('property_type', options.propertyType);
      } else {
        query = query.eq('property_type', options.propertyType);
      }
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
    if (options?.bedrooms !== undefined) {
      query = query.gte('bedrooms', options.bedrooms);
    }
    if (options?.bathrooms !== undefined) {
      query = query.gte('bathrooms', options.bathrooms);
    }
    if (options?.areaMin !== undefined) {
      query = query.gte('area', options.areaMin);
    }
    if (options?.areaMax !== undefined) {
      query = query.lte('area', options.areaMax);
    }
    if (options?.keyword) {
      const kw = options.keyword;
      const filters = [
        `title.ilike.%${kw}%`,
        `description.ilike.%${kw}%`,
        `city.ilike.%${kw}%`,
        `address.ilike.%${kw}%`
      ];
      query = query.or(filters.join(','));
    }

    // Sorting - map to correct column names
    let sortBy = options?.sort || 'created_at';
    if (sortBy === 'propertyType') sortBy = 'property_type';
    const sortOrder = options?.order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const skip = options?.skip || 0;
    const limit = options?.limit || 12;
    query = query.range(skip, skip + limit - 1);

    const { data, error } = await query;
    if (error) throw error;

    // Listing cards read `property.images[0].url`, so hydrate the normalized
    // child table in one batched query rather than leaving every card blank.
    const properties = (data || []) as PropertyDoc[];
    await this.attachImages(properties);
    await this.attachOwners(properties);
    return properties;
  },

  // Attach the owner record to a list of properties (single batched query).
  // The API contract exposes `owner` as an object with contact details.
  async attachOwners(properties: PropertyDoc[]): Promise<PropertyDoc[]> {
    if (properties.length === 0) return properties;

    const ownerIds = [...new Set(properties.map((p) => p.owner_id).filter(Boolean))];
    if (ownerIds.length === 0) return properties;

    const { data, error } = await supabaseClient
      .from('users')
      .select('id, name, email, mobile, avatar')
      .in('id', ownerIds);

    if (error) throw error;

    const byId = new Map((data || []).map((u: any) => [u.id, u]));
    for (const property of properties) {
      property.owner = byId.get(property.owner_id) || null;
    }
    return properties;
  },

  // Attach property_images rows to a list of properties (single batched query)
  async attachImages(properties: PropertyDoc[]): Promise<PropertyDoc[]> {
    if (properties.length === 0) return properties;

    const { data, error } = await supabaseClient
      .from('property_images')
      .select('*')
      .in('property_id', properties.map((p) => p.id))
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const byProperty = new Map<string, PropertyImage[]>();
    for (const image of (data || []) as PropertyImage[]) {
      const list = byProperty.get(image.property_id) || [];
      list.push(image);
      byProperty.set(image.property_id, list);
    }

    for (const property of properties) {
      property.images = byProperty.get(property.id) || [];
    }
    return properties;
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

    if (includeImages) await this.attachImages([property]);
    await this.attachOwners([property]);

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
    // Generate unique slug from title (null when the column is not deployed yet)
    const slug = await this.generateUniqueSlug(input.title);

    const buildRow = (withSlug: boolean) => ({
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
        status: input.status || 'draft',
        ...(withSlug && slug ? { slug } : {}),
    });

    let { data, error } = await supabaseClient
      .from('properties')
      .insert(buildRow(true))
      .select()
      .single();

    // The slug column may not exist in this environment yet; retry without it.
    if (error && noteSlugColumnMissing(error)) {
      ({ data, error } = await supabaseClient
        .from('properties')
        .insert(buildRow(false))
        .select()
        .single());
    }

    if (error) throw error;
    const property = data as PropertyDoc;

    // Insert images if provided
    if (input.images && input.images.length > 0) {
      property.images = await this.replaceImages(property.id, input.images);
    }

    return property;
  },

  // Replace the full image set for a property, preserving the given order
  async replaceImages(
    propertyId: string,
    images: Array<{ url: string; publicId?: string }>
  ): Promise<PropertyImage[]> {
    const { error: deleteError } = await supabaseClient
      .from('property_images')
      .delete()
      .eq('property_id', propertyId);

    if (deleteError) throw deleteError;

    if (images.length === 0) return [];

    const rows = images.map((img, idx) => ({
      property_id: propertyId,
      url: img.url,
      public_id: img.publicId || `img_${propertyId}_${idx}`,
      sort_order: idx,
    }));

    const { data, error } = await supabaseClient
      .from('property_images')
      .insert(rows)
      .select();

    if (error) throw error;
    return (data || []) as PropertyImage[];
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

  // Count properties with support for complex filters
  async countDocuments(filters?: {
    status?: string | string[];
    city?: string;
    propertyType?: string | string[];
    priceMin?: number;
    priceMax?: number;
    owner_id?: string;
    bedrooms?: number;
    bathrooms?: number;
    areaMin?: number;
    areaMax?: number;
    keyword?: string;
  }): Promise<number> {
    let query = supabaseClient
      .from('properties')
      .select('*', { count: 'exact', head: true });

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    if (filters?.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }
    if (filters?.propertyType) {
      if (Array.isArray(filters.propertyType)) {
        query = query.in('property_type', filters.propertyType);
      } else {
        query = query.eq('property_type', filters.propertyType);
      }
    }
    if (filters?.priceMin !== undefined) {
      query = query.gte('price', filters.priceMin);
    }
    if (filters?.priceMax !== undefined) {
      query = query.lte('price', filters.priceMax);
    }
    if (filters?.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }
    if (filters?.bedrooms !== undefined) {
      query = query.gte('bedrooms', filters.bedrooms);
    }
    if (filters?.bathrooms !== undefined) {
      query = query.gte('bathrooms', filters.bathrooms);
    }
    if (filters?.areaMin !== undefined) {
      query = query.gte('area', filters.areaMin);
    }
    if (filters?.areaMax !== undefined) {
      query = query.lte('area', filters.areaMax);
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

  // Generate a unique slug from title (with retry on collision).
  // Returns null when the slug column has not been deployed to this environment.
  async generateUniqueSlug(title: string): Promise<string | null> {
    if (slugColumnAvailable === false) return null;

    // A title of only punctuation/emoji slugifies to an empty string, which would
    // collide with every other such title. Fall back to a generic stem.
    const baseSlug = slugify(title) || 'listing';
    let slug = baseSlug;
    let attempt = 1;

    while (attempt < 100) {
      const { data, error } = await supabaseClient
        .from('properties')
        .select('id')
        .eq('slug', slug)
        .limit(1);

      if (error) {
        if (noteSlugColumnMissing(error)) return null;
        if (error.code !== 'PGRST116') throw error;
      }

      slugColumnAvailable = true;

      if (!data || data.length === 0) {
        return slug; // Slug is unique
      }

      // Slug exists, append suffix and retry
      slug = `${baseSlug}-${attempt}`;
      attempt++;
    }

    // Fall back to a random suffix rather than failing the whole create
    return `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
  },

  // Find property by UUID or slug (backward-compatible)
  async findByIdOrSlug(identifier: string, includeImages = true): Promise<PropertyDoc | null> {
    // Without the slug column, only UUID lookups are possible
    if (!isUUID(identifier) && slugColumnAvailable === false) return null;

    const column = isUUID(identifier) ? 'id' : 'slug';

    const { data, error } = await supabaseClient
      .from('properties')
      .select('*')
      .eq(column, identifier)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      if (noteSlugColumnMissing(error)) return null;
      throw error;
    }

    const property = data as PropertyDoc;

    if (includeImages) await this.attachImages([property]);
    await this.attachOwners([property]);

    return property;
  },

};
