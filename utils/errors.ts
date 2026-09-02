import { isSupabaseConfigured } from '../lib/supabase';

export const CONFIG_ERROR =
  "RIFAA isn't connected to a backend yet. Add your Supabase credentials to save expenses.";
export const GENERIC_ERROR = "We couldn't save this expense. Please try again.";
export const DELETE_ERROR = "We couldn't delete this expense. Please try again.";
export const FAMILY_ERROR = 'Please complete your family setup before adding an expense.';
export const PERMISSION_ERROR = "You don't have permission to save this expense yet.";
export const AUTH_ERROR = 'Please sign in to save expenses.';

export type ActionKind = 'save' | 'delete';

/**
 * Centralized user-facing error mapper. Never exposes raw Supabase,
 * PostgreSQL, RLS or stack information — only concise, safe messages.
 */
export function mapActionError(error: Error, kind: ActionKind = 'save'): string {
  const message = error.message;
  if (!isSupabaseConfigured || message.includes('[supabase]') || /not configured/i.test(message)) {
    return CONFIG_ERROR;
  }
  if (/(failed to fetch|network|timeout|econnaborted|socket)/i.test(message)) {
    return kind === 'delete' ? DELETE_ERROR : GENERIC_ERROR;
  }
  if (/(permission|rls|policy|row.level)/i.test(message)) {
    return kind === 'delete' ? DELETE_ERROR : PERMISSION_ERROR;
  }
  if (/\bfamily\b/i.test(message)) {
    return FAMILY_ERROR;
  }
  return kind === 'delete' ? DELETE_ERROR : GENERIC_ERROR;
}