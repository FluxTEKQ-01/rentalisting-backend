import { supabaseClient } from '../config/supabase.js';

// Repository for comment operations against Supabase
// Mirrors the interface of the Mongoose Comment model

export interface CommentDoc {
  id: string;
  property_id: string;
  name: string;
  email: string;
  address: string;
  comment: string;
  created_at: string;
}

export interface CreateCommentInput {
  property_id: string;
  name: string;
  email: string;
  address?: string;
  comment: string;
}

export const commentRepository = {
  // Find comments by property ID
  async find(propertyId: string, options?: { skip?: number; limit?: number }): Promise<CommentDoc[]> {
    let query = supabaseClient
      .from('comments')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (options?.skip !== undefined && options?.limit !== undefined) {
      query = query.range(options.skip, options.skip + options.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as CommentDoc[];
  },

  // Find comment by ID
  async findById(id: string): Promise<CommentDoc | null> {
    const { data, error } = await supabaseClient
      .from('comments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as CommentDoc;
  },

  // Create a new comment
  async create(input: CreateCommentInput): Promise<CommentDoc> {
    const { data, error } = await supabaseClient
      .from('comments')
      .insert({
        property_id: input.property_id,
        name: input.name,
        email: input.email,
        address: input.address || '',
        comment: input.comment,
      })
      .select()
      .single();

    if (error) throw error;
    return data as CommentDoc;
  },

  // Count comments for a property
  async countByProperty(propertyId: string): Promise<number> {
    const { count, error } = await supabaseClient
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId);

    if (error) throw error;
    return count || 0;
  },

  // Count total comments
  async countDocuments(): Promise<number> {
    const { count, error } = await supabaseClient
      .from('comments')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  },
};
