/**
 * Only notification types with a real, active event source are allowed. This
 * keeps the surface small and prevents "orphan" notifications with no producer.
 */
export type NotificationType =
  | 'shared_expense_added'
  | 'savings_contribution_added'
  | 'system';

export type AppNotification = {
  id: string;
  user_id: string;
  family_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  route: string | null; // internal app href; never an untrusted URL
  metadata: Record<string, unknown> | null;
  created_at: string;
};
