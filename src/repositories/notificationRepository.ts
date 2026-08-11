import { supabaseClient } from '../config/supabase.js';

// Repository for notification operations against Supabase
// Mirrors the interface of the Mongoose Notification model

export type NotificationType =
  | 'listing_submitted'
  | 'listing_approved'
  | 'listing_rejected'
  | 'listing_resubmitted'
  | 'feedback_available'
  | 'listing_published'
  | 'new_submission'
  | 'new_review'
  | 'inquiry';

export interface NotificationDoc {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface CreateNotificationInput {
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export const notificationRepository = {
  // Find notifications for a user
  async find(recipientId: string, options?: { skip?: number; limit?: number }): Promise<NotificationDoc[]> {
    let query = supabaseClient
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false });

    if (options?.skip !== undefined && options?.limit !== undefined) {
      query = query.range(options.skip, options.skip + options.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as NotificationDoc[];
  },

  // Find notification by ID
  async findById(id: string): Promise<NotificationDoc | null> {
    const { data, error } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as NotificationDoc;
  },

  // Create a new notification
  async create(input: CreateNotificationInput): Promise<NotificationDoc> {
    const { data, error } = await supabaseClient
      .from('notifications')
      .insert({
        recipient_id: input.recipient_id,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: input.metadata || {},
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as NotificationDoc;
  },

  // Mark notification as read
  async markAsRead(id: string): Promise<NotificationDoc | null> {
    const { data, error } = await supabaseClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as NotificationDoc;
  },

  // Mark all notifications as read for a user
  async markAllAsRead(recipientId: string): Promise<number> {
    const { error, count } = await supabaseClient
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', recipientId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  // Count unread notifications for a user
  async countUnread(recipientId: string): Promise<number> {
    const { count, error } = await supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', recipientId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  // Get unread notifications
  async findUnread(recipientId: string): Promise<NotificationDoc[]> {
    const { data, error } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as NotificationDoc[];
  },

  // Delete notification
  async findByIdAndDelete(id: string): Promise<NotificationDoc | null> {
    const { data, error } = await supabaseClient
      .from('notifications')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as NotificationDoc;
  },

  // Count total notifications
  async countDocuments(): Promise<number> {
    const { count, error } = await supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  },

  // Bulk create notifications (for system events)
  async createBulk(notifications: CreateNotificationInput[]): Promise<NotificationDoc[]> {
    if (notifications.length === 0) return [];

    const { data, error } = await supabaseClient
      .from('notifications')
      .insert(
        notifications.map((n) => ({
          recipient_id: n.recipient_id,
          type: n.type,
          title: n.title,
          message: n.message,
          metadata: n.metadata || {},
          is_read: false,
        }))
      )
      .select();

    if (error) throw error;
    return (data || []) as NotificationDoc[];
  },

  // Count all notifications for a recipient
  async countByRecipient(recipientId: string): Promise<number> {
    const { count, error } = await supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', recipientId);

    if (error) throw error;
    return count || 0;
  },
};
