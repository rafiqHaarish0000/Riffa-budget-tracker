import { supabase } from './supabase';

/**
 * Fire-and-forget helpers used at client mutation points to notify the other
 * members of the caller's family. They call narrowly-scoped SECURITY DEFINER
 * RPCs (`notify_shared_expense`, `notify_savings_contribution`) that derive the
 * actor, family, recipients, type, title/message, and route entirely on the
 * server from real domain rows. The client can never choose a recipient or
 * forge notification content. Failures are intentionally swallowed so a
 * missing/errant notification backend can never break the primary action.
 */

/** Notify the family about a just-created shared expense. */
export async function notifySharedExpense(expenseId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('notify_shared_expense', {
      p_expense_id: expenseId,
    });
    if (error) {
      console.warn('[notifications] notify_shared_expense:', error.message);
    }
  } catch (err) {
    console.warn('[notifications] notify_shared_expense threw:', err);
  }
}

/** Notify the family about a just-added savings contribution. */
export async function notifySavingsContribution(goalId: string, amount: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('notify_savings_contribution', {
      p_goal_id: goalId,
      p_amount: amount,
    });
    if (error) {
      console.warn('[notifications] notify_savings_contribution:', error.message);
    }
  } catch (err) {
    console.warn('[notifications] notify_savings_contribution threw:', err);
  }
}
