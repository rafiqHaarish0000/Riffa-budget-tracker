import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifySharedExpense } from '../lib/notifications';
import type { Expense, NewExpenseInput } from '../types/expense';

export type ExpenseDateRange = {
  start: string; // inclusive YYYY-MM-DD
  end: string; // inclusive YYYY-MM-DD
};

type UseExpensesResult = {
  expenses: Expense[];
  expense: Expense | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addExpense: (input: NewExpenseInput) => Promise<{ error: Error | null }>;
  updateExpense: (id: string, patch: Partial<NewExpenseInput>) => Promise<{ error: Error | null }>;
  deleteExpense: (id: string) => Promise<{ error: Error | null }>;
  getExpense: (id: string) => Promise<{ error: Error | null }>;
};

export function useExpenses(
  familyId: string | null,
  userId: string | null,
  dateRange?: ExpenseDateRange,
): UseExpensesResult {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadExpenses = useCallback(async () => {
    if (!familyId || !userId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('expenses').select('*').eq('family_id', familyId);
      if (dateRange) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end);
      }
      const { data, error: queryError } = await query.order('date', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      // Shared expenses are visible to everyone; personal expenses only to their owner.
      const visible = (data ?? []).filter(
        (e) => e.type === 'shared' || e.user_id === userId,
      );

      setExpenses(visible);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [familyId, userId, dateRange]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const getExpense = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      if (!familyId || !userId || !id) {
        setExpense(null);
        return { error: new Error('Invalid parameters.') };
      }

      let active = true;
      try {
        const { data, error: queryError } = await supabase
          .from('expenses')
          .select('*')
          .eq('id', id)
          .single();

        if (queryError) {
          throw queryError;
        }

        // Privacy (defense-in-depth): shared visible to all; personal only to owner.
        if (!data || (data.type !== 'shared' && data.user_id !== userId)) {
          if (active) setExpense(null);
          return { error: new Error('Access denied.') };
        }

        if (active) {
          setExpense(data);
          setError(null);
        }
        return { error: null };
      } catch (err) {
        if (active) setExpense(null);
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [familyId, userId],
  );

  const addExpense = useCallback(
    async (input: NewExpenseInput): Promise<{ error: Error | null }> => {
      if (!familyId || !userId) {
        return { error: new Error('Family not available.') };
      }
      const { data, error: insertError } = await supabase
        .from('expenses')
        .insert({
          ...input,
          family_id: familyId,
          user_id: userId,
        })
        .select('id')
        .single();
      if (!insertError) {
        await loadExpenses();
        // Real event: a shared expense is visible to the whole family, so other
        // members get notified. The scoped RPC derives recipients and content
        // from the stored expense row; personal expenses are never broadcast.
        if (input.type === 'shared' && data?.id) {
          void notifySharedExpense(data.id);
        }
      }
      return { error: insertError ? new Error(insertError.message) : null };
    },
    [familyId, userId, loadExpenses],
  );

  const updateExpense = useCallback(
    async (id: string, patch: Partial<NewExpenseInput>): Promise<{ error: Error | null }> => {
      const { error: updateError } = await supabase.from('expenses').update(patch).eq('id', id);
      if (!updateError) {
        await loadExpenses();
      }
      return { error: updateError ? new Error(updateError.message) : null };
    },
    [loadExpenses],
  );

  const deleteExpense = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      const { error: deleteError } = await supabase.from('expenses').delete().eq('id', id);
      if (!deleteError) {
        await loadExpenses();
      }
      return { error: deleteError ? new Error(deleteError.message) : null };
    },
    [loadExpenses],
  );

  return {
    expenses,
    expense,
    loading,
    error,
    refetch: loadExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpense,
  };
}