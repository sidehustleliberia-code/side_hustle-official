'use client';

import { createClient } from '@/lib/supabase/client';
import type { NotificationType } from '@/lib/types/database';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  jobId: string | null;
  isRead: boolean;
  createdAt: string;
}

function toAppNotification(row: any): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.notification_type,
    title: row.title,
    body: row.body,
    jobId: row.job_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export const notificationService = {
  /** Fetch all notifications for the current user, newest first */
  async getNotifications(userId: string): Promise<AppNotification[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return [];
      return (data || []).map(toAppNotification);
    } catch {
      return [];
    }
  },

  /** Get unread notification count for badge display */
  async getUnreadCount(userId: string): Promise<number> {
    const supabase = createClient();
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  },

  /** Mark a single notification as read */
  async markAsRead(notificationId: string): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      return !error;
    } catch {
      return false;
    }
  },

  /** Mark all notifications as read for a user */
  async markAllAsRead(userId: string): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Subscribe to real-time notification inserts for a user.
   * Returns an unsubscribe function.
   */
  subscribeToNotifications(
    userId: string,
    onNew: (notification: AppNotification) => void
  ): () => void {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNew(toAppNotification(payload.new));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
