import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { NewSavingsContributionInput, NewSavingsGoalInput, SavingsContribution, SavingsGoal } from '../types/savings';

type UseSavingsResult = {
  goals: SavingsGoal[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createGoal: (input: NewSavingsGoalInput) => Promise<{ error: Error | null }>;
  updateGoal: (id: string, patch: Partial<NewSavingsGoalInput>) => Promise<{ error: Error | null }>;
  deleteGoal: (id: string) => Promise<{ error: Error | null }>;
  addContribution: (input: NewSavingsContributionInput) => Promise<{ error: Error | null }>;
  contributionsForGoal: (goalId: string) => Promise<SavingsContribution[]>;
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
      const { error: insertError } = await supabase.from('savings_contributions').insert({
        ...input,
        user_id: userId,
      });
      if (!insertError) {
        await loadGoals();
      }
      return { error: insertError ? new Error(insertError.message) : null };
    },
    [userId, loadGoals],
  );

  const contributionsForGoal = useCallback(
    async (goalId: string): Promise<SavingsContribution[]> => {
      const { data } = await supabase
        .from('savings_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('date', { ascending: false });
      return data ?? [];
    },
    [],
  );

  return { goals, loading, error, refetch: loadGoals, createGoal, updateGoal, deleteGoal, addContribution, contributionsForGoal };
}
