import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifySavingsContribution } from '../lib/notifications';
import type {
  NewSavingsContributionInput,
  NewSavingsGoalInput,
  SavingsContributionWithUser,
  SavingsGoal,
} from '../types/savings';

type UseSavingsResult = {
  goals: SavingsGoal[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createGoal: (input: NewSavingsGoalInput) => Promise<{ error: Error | null }>;
  updateGoal: (id: string, patch: Partial<NewSavingsGoalInput>) => Promise<{ error: Error | null }>;
  deleteGoal: (id: string) => Promise<{ error: Error | null }>;
  addContribution: (input: NewSavingsContributionInput) => Promise<{ error: Error | null }>;
  contributionsForGoal: (
    goalId: string,
  ) => Promise<{ data: SavingsContributionWithUser[]; error: Error | null }>;
};

export function useSavings(familyId: string | null, userId: string | null): UseSavingsResult {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadGoals = useCallback(async () => {
    if (!familyId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });

      if (queryError) {
        throw queryError;
      }
      setGoals(data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const createGoal = useCallback(
    async (input: NewSavingsGoalInput): Promise<{ error: Error | null }> => {
      if (!familyId) {
        return { error: new Error('Family not available.') };
      }
      const { error: insertError } = await supabase.from('savings_goals').insert({
        ...input,
        family_id: familyId,
      });
      if (!insertError) {
        await loadGoals();
      }
      return { error: insertError ? new Error(insertError.message) : null };
    },
    [familyId, loadGoals],
  );

  const updateGoal = useCallback(
    async (id: string, patch: Partial<NewSavingsGoalInput>): Promise<{ error: Error | null }> => {
      const { error: updateError } = await supabase.from('savings_goals').update(patch).eq('id', id);
      if (!updateError) {
        await loadGoals();
      }
      return { error: updateError ? new Error(updateError.message) : null };
    },
    [loadGoals],
  );

  const deleteGoal = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      const { error: deleteError } = await supabase.from('savings_goals').delete().eq('id', id);
      if (!deleteError) {
        await loadGoals();
      }
      return { error: deleteError ? new Error(deleteError.message) : null };
    },
    [loadGoals],
  );

  const addContribution = useCallback(
    async (input: NewSavingsContributionInput): Promise<{ error: Error | null }> => {
      if (!userId) {
        return { error: new Error('Not authenticated.') };
      }

      // Prefer the atomic, server-authoritative RPC. It derives `user_id` from
      // auth.uid(), enforces the contribution -> goal -> family chain, and
      // inserts + increments the goal balance in one transaction.
      const { error: rpcError } = await supabase.rpc('add_savings_contribution', {
        p_goal_id: input.goal_id,
        p_amount: input.amount,
        p_date: input.date,
      });

      if (!rpcError) {
        await loadGoals();
        // Real event: savings goals are family-scoped, so other members get
        // notified about the contribution. Recipients/content are server-derived.
        void notifySavingsContribution(input.goal_id, input.amount);
        return { error: null };
      }

      // Fallback (e.g. the atomic RPC migration is not yet applied): keep the
      // historical direct-insert behavior, guarded by RLS on the underlying
      // tables. Never report the raw RPC error; surface a friendly message.
      const { data: goalData, error: goalError } = await supabase
        .from('savings_goals')
        .select('current_amount, name')
        .eq('id', input.goal_id)
        .maybeSingle();

      if (goalError) {
        return { error: new Error(goalError.message) };
      }
      const current = goalData?.current_amount ?? 0;
      const nextCurrent = Math.max(0, current + input.amount);

      const { error: insertError } = await supabase.from('savings_contributions').insert({
        ...input,
        user_id: userId,
      });
      if (insertError) {
        return { error: new Error(insertError.message) };
      }

      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: nextCurrent })
        .eq('id', input.goal_id);

      if (!updateError) {
        await loadGoals();
        void notifySavingsContribution(input.goal_id, input.amount);
      }
      return { error: updateError ? new Error(updateError.message) : null };
    },
    [userId, loadGoals],
  );

  const contributionsForGoal = useCallback(
    async (goalId: string): Promise<{ data: SavingsContributionWithUser[]; error: Error | null }> => {
      try {
        const { data, error } = await supabase
          .from('savings_contributions')
          .select('*, user:users(id, name)')
          .eq('goal_id', goalId)
          .order('date', { ascending: false });
        if (error) {
          throw error;
        }
        return { data: (data ?? []) as SavingsContributionWithUser[], error: null };
      } catch (err) {
        return {
          data: [],
          error: err instanceof Error ? err : new Error(String(err)),
        };
      }
    },
    [],
  );

  return { goals, loading, error, refetch: loadGoals, createGoal, updateGoal, deleteGoal, addContribution, contributionsForGoal };
}
