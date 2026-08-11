import { supabaseClient } from '../config/supabase.js';
import type { JwtPayload } from '../types/index.js';

// Repository for user-related database operations against Supabase
// Mirrors the interface of the Mongoose User model

export interface UserDoc {
  id: string;
  name: string;
  email: string;
  mobile: string;
  password_hash: string;
  role: 'visitor' | 'owner' | 'admin';
  avatar: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  mobile: string;
  password: string; // Will be hashed before storage
  role?: 'visitor' | 'owner' | 'admin';
  avatar?: string;
}

export interface UpdateUserInput {
  name?: string;
  avatar?: string;
  isActive?: boolean;
}

export const userRepository = {
  // Find user by ID
  async findById(id: string): Promise<UserDoc | null> {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data as UserDoc;
  },

  // Find user by email
  async findOne(query: { email?: string; mobile?: string }): Promise<UserDoc | null> {
    let q = supabaseClient.from('users').select('*');

    if (query.email) {
      q = q.eq('email', query.email.toLowerCase());
    } else if (query.mobile) {
      q = q.eq('mobile', query.mobile);
    } else {
      return null;
    }

    const { data, error } = await q.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as UserDoc;
  },

  // Both email and mobile are UNIQUE, so registration must check both up front.
  // Two plain equality queries rather than a PostgREST `or` filter, because
  // mobile numbers may contain characters ('+') that need escaping in that syntax.
  async findConflict(
    email: string,
    mobile: string
  ): Promise<{ user: UserDoc; field: 'email' | 'mobile' } | null> {
    const byEmail = await this.findOne({ email });
    if (byEmail) return { user: byEmail, field: 'email' };

    const byMobile = await this.findOne({ mobile });
    if (byMobile) return { user: byMobile, field: 'mobile' };

    return null;
  },

  // Create a new user
  async create(input: CreateUserInput): Promise<UserDoc> {
    const { data, error } = await supabaseClient
      .from('users')
      .insert({
        name: input.name,
        email: input.email.toLowerCase(),
        mobile: input.mobile,
        password_hash: input.password, // Should be pre-hashed by controller
        role: input.role || 'owner',
        avatar: input.avatar || '',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as UserDoc;
  },

  // Find user by ID and return without password_hash (safe for API responses)
  async findByIdSafe(id: string): Promise<Omit<UserDoc, 'password_hash'> | null> {
    const { data, error } = await supabaseClient
      .from('users')
      .select('id, name, email, mobile, role, avatar, is_active, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as Omit<UserDoc, 'password_hash'>;
  },

  // Update user fields
  async findByIdAndUpdate(id: string, updates: UpdateUserInput): Promise<UserDoc | null> {
    const updatePayload: any = {};
    if (updates.name) updatePayload.name = updates.name;
    if (updates.avatar !== undefined) updatePayload.avatar = updates.avatar;
    if (updates.isActive !== undefined) updatePayload.is_active = updates.isActive;

    const { data, error } = await supabaseClient
      .from('users')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as UserDoc;
  },

  // Toggle user active status
  async toggleStatus(id: string): Promise<UserDoc | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const { data, error } = await supabaseClient
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as UserDoc;
  },

  // Delete user
  async findByIdAndDelete(id: string): Promise<UserDoc | null> {
    // Soft delete by setting is_active to false, or hard delete
    // For now, hard delete (Postgres FK cascade will handle related records per schema)
    const { data, error } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as UserDoc;
  },

  // Get all users
  async find(): Promise<UserDoc[]> {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*');

    if (error) throw error;
    return (data || []) as UserDoc[];
  },

  // Count total users
  async countDocuments(): Promise<number> {
    const { count, error } = await supabaseClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  },

  // Count users by role
  async countByRole(role: 'visitor' | 'owner' | 'admin'): Promise<number> {
    const { count, error } = await supabaseClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', role);

    if (error) throw error;
    return count || 0;
  },

  // Find users by role
  async findByRole(role: 'visitor' | 'owner' | 'admin'): Promise<UserDoc[]> {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('role', role);

    if (error) throw error;
    return (data || []) as UserDoc[];
  },
};
