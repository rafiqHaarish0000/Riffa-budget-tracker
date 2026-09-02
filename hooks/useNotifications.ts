import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { AppNotification } from '../types/notification';

type UseNotificationsResult = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
};

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: queryError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (queryError) {
        throw queryError;
      }
      setNotifications(data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      // Optimistic local update; re-sync from the server if the write fails.
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id && !n.is_read
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n,
        ),
      );
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);
      if (updateError) {
        console.warn('[notifications] markAsRead:', updateError.message);
        await refresh();
      }
    },
    [userId, refresh],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return;
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.is_read ? n : { ...n, is_read: true, read_at: now })),
    );
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (updateError) {
      console.warn('[notifications] markAllAsRead:', updateError.message);
      await refresh();
    }
  }, [userId, unreadCount, refresh]);

  const deleteNotification = useCallback(
    async (id: string) => {
      if (!userId) return;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (deleteError) {
        console.warn('[notifications] deleteNotification:', deleteError.message);
        await refresh();
      }
    },
    [userId, refresh],
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
