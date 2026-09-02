export type NotificationType = 'expense' | 'savings' | 'family' | 'system';

export type AppNotification = {
  id: string;
  family_id: string | null;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type NewNotificationInput = {
  family_id?: string | null;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
};
