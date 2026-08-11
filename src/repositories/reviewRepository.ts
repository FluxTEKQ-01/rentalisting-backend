import { supabaseClient } from '../config/supabase.js';

// Repository for review operations against Supabase
// Mirrors the interface of the Mongoose Review model

export interface ReviewDoc {
  id: string;
  property_id: string;
  user_id?: string;
  user_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewInput {
  property_id: string;
  user_id?: string;
  user_name?: string;
  rating: number;
  comment: string;
  is_approved?: boolean;
}

export interface UpdateReviewInput {
  user_name?: string;
  rating?: number;
  comment?: string;
  is_approved?: boolean;
}

export const reviewRepository = {
  // Find reviews by property ID
  async find(propertyId: string, options?: { skip?: number; limit?: number }): Promise<ReviewDoc[]> {
    let query = supabaseClient
      .from('reviews')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (options?.skip !== undefined && options?.limit !== undefined) {
      query = query.range(options.skip, options.skip + options.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ReviewDoc[];
  },

  // Find review by ID
  async findById(id: string): Promise<ReviewDoc | null> {
    const { data, error } = await supabaseClient
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ReviewDoc;
  },

  // Create a new review
  async create(input: CreateReviewInput): Promise<ReviewDoc> {
    const { data, error } = await supabaseClient
      .from('reviews')
      .insert({
        property_id: input.property_id,
        user_id: input.user_id || null,
        user_name: input.user_name || 'Verified Visitor',
        rating: input.rating,
        comment: input.comment,
        is_approved: input.is_approved !== false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ReviewDoc;
  },

  // Update review
  async findByIdAndUpdate(id: string, updates: UpdateReviewInput): Promise<ReviewDoc | null> {
    const updatePayload: any = {};
    if (updates.user_name !== undefined) updatePayload.user_name = updates.user_name;
    if (updates.rating !== undefined) updatePayload.rating = updates.rating;
    if (updates.comment !== undefined) updatePayload.comment = updates.comment;
    if (updates.is_approved !== undefined) updatePayload.is_approved = updates.is_approved;

    const { data, error } = await supabaseClient
      .from('reviews')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ReviewDoc;
  },

  // Delete review
  async findByIdAndDelete(id: string): Promise<ReviewDoc | null> {
    const { data, error } = await supabaseClient
      .from('reviews')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ReviewDoc;
  },

  // Count reviews for a property
  async countByProperty(propertyId: string): Promise<number> {
    const { count, error } = await supabaseClient
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId);

    if (error) throw error;
    return count || 0;
  },

  // Get all reviews (for admin)
  async find_all(): Promise<ReviewDoc[]> {
    const { data, error } = await supabaseClient
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ReviewDoc[];
  },

  // Count total reviews
  async countDocuments(): Promise<number> {
    const { count, error } = await supabaseClient
      .from('reviews')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  },
};
