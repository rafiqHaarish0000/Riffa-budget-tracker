import { supabase } from './supabase';
import type { NotificationType } from '../types/notification';

type NotifyPayload = {
  type: NotificationType;
  title: string;
  message: string;
  route?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Fire-and-forget helper used at client mutation points to notify the other
 * members of the caller's family. All recipient resolution and authorization
 * happen inside the SECURITY DEFINER `notify_family` RPC; the client only ever
 * supplies content, never a target user. Failures are intentionally swallowed
 * so a missing/errant notification backend can never break the primary action.
 */
export async function notifyFamily(payload: NotifyPayload): Promise<void> {
  try {
    const { error } = await supabase.rpc('notify_family', {
      p_type: payload.type,
      p_title: payload.title,
      p_message: payload.message,
      p_route: payload.route ?? null,
      p_metadata: payload.metadata ?? null,
    });
    if (error) {
      console.warn('[notifications] notify_family:', error.message);
    }
  } catch (err) {
    console.warn('[notifications] notify_family threw:', err);
  }
}
