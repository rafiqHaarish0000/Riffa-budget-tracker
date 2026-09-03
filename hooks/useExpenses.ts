import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifySharedExpense } from '../lib/notifications';
import type {
  Expense,
  ExpenseAllocation,
  ExpensePayment,
  NewExpenseInput,
  NewExpenseWithPayments,
} from '../types/expense';

export type ExpenseDateRange = {
  start: string; // inclusive YYYY-MM-DD
  end: string; // inclusive YYYY-MM-DD
};

type UseExpensesResult = {
  expenses: Expense[];
  expense: Expense | null;
  /** Payments grouped by expense_id, for the currently loaded expense list. */
  paymentsByExpense: Record<string, ExpensePayment[]>;
  /** Payments for the currently selected single expense (details view). */
  expensePayments: ExpensePayment[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addExpense: (
    input: NewExpenseWithPayments | NewExpenseInput,
  ) => Promise<{ error: Error | null; id: string | null }>;
  updateExpense: (
    id: string,
    input: NewExpenseWithPayments | { patch: Partial<NewExpenseInput> },
  ) => Promise<{ error: Error | null }>;
  deleteExpense: (id: string) => Promise<{ error: Error | null }>;
  getExpense: (id: string) => Promise<{ error: Error | null }>;
};

/** True when the caller passed the new atomic allocation form. */
function isWithPayments(
  input: NewExpenseWithPayments | NewExpenseInput,
): input is NewExpenseWithPayments {
  return Array.isArray((input as NewExpenseWithPayments).payments);
}

export function useExpenses(
  familyId: string | null,
  userId: string | null,
  dateRange?: ExpenseDateRange,
): UseExpensesResult {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [paymentsByExpense, setPaymentsByExpense] = useState<Record<string, ExpensePayment[]>>({});
  const [expensePayments, setExpensePayments] = useState<ExpensePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadExpenses = useCallback(async () => {
    if (!familyId || !userId) {
      setExpenses([]);
      setPaymentsByExpense({});
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

      // Fetch payment allocations for the visible expenses in ONE query (group
      // in memory by expense_id) to avoid an N+1 query per list row.
      if (visible.length === 0) {
        setPaymentsByExpense({});
      } else {
        const ids = visible.map((e) => e.id);
        const { data: paymentRows, error: paymentError } = await supabase
          .from('expense_payments')
          .select('*')
          .in('expense_id', ids);
        if (paymentError) {
          throw paymentError;
        }
        const grouped: Record<string, ExpensePayment[]> = {};
        for (const payment of paymentRows ?? []) {
          const list = grouped[payment.expense_id];
          if (list) {
            list.push(payment);
          } else {
            grouped[payment.expense_id] = [payment];
          }
        }
        setPaymentsByExpense(grouped);
      }

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
        setExpensePayments([]);
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

        // Payment allocations for this expense. RLS limits this to what the user
        // can see (shared members / personal owner), so a viewer can never read
        // another user's personal payment breakdown.
        const { data: paymentRows, error: paymentError } = await supabase
          .from('expense_payments')
          .select('*')
          .eq('expense_id', id);

        if (active) {
          setExpense(data);
          setExpensePayments(paymentRows ?? []);
          setError(null);
        }
        if (paymentError) {
          throw paymentError;
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
    async (
      input: NewExpenseWithPayments | NewExpenseInput,
    ): Promise<{ error: Error | null; id: string | null }> => {
      if (!familyId || !userId) {
        return { error: new Error('Family not available.'), id: null };
      }

      let newId: string | null = null;
      let insertError: Error | null = null;

      if (isWithPayments(input)) {
        // Atomic server-authoritative create: expense + validated payment rows.
        const { data, error } = await supabase.rpc('create_expense_with_payments', {
          p_amount: input.amount,
          p_category: input.category,
          p_type: input.type,
          p_date: input.date,
          p_note: input.note ?? null,
          p_payments: input.payments,
        });
        insertError = error ? new Error(error.message) : null;
        newId = data ?? null;
      } else {
        // Backward-compatible single-payer path (kept for safety; splits).
        const { data, error: insertErrorRaw } = await supabase
          .from('expenses')
          .insert({
            ...input,
            family_id: familyId,
            user_id: userId,
          })
          .select('id')
          .single();
        insertError = insertErrorRaw ? new Error(insertErrorRaw.message) : null;
        newId = data?.id ?? null;
      }

      if (!insertError) {
        await loadExpenses();
        // Real event: a shared expense is visible to the whole family, so other
        // members get notified exactly ONCE (regardless of how many payers the
        // split has). The scoped RPC derives recipients and content from the
        // stored expense row; personal expenses are never broadcast.
        if (input.type === 'shared' && newId) {
          void notifySharedExpense(newId);
        }
      }
      return { error: insertError, id: newId };
    },
    [familyId, userId, loadExpenses],
  );

  const updateExpense = useCallback(
    async (
      id: string,
      input: NewExpenseWithPayments | { patch: Partial<NewExpenseInput> },
    ): Promise<{ error: Error | null }> => {
      let updateError: Error | null = null;

      if (!('patch' in input)) {
        // Atomic server-authoritative update: expense + replacement payment rows.
        const { error } = await supabase.rpc('update_expense_with_payments', {
          p_expense_id: id,
          p_amount: input.amount,
          p_category: input.category,
          p_type: input.type,
          p_date: input.date,
          p_note: input.note ?? null,
          p_payments: input.payments,
        });
        updateError = error ? new Error(error.message) : null;
      } else {
        const { error } = await supabase.from('expenses').update(input.patch).eq('id', id);
        updateError = error ? new Error(error.message) : null;
      }

      if (!updateError) {
        await loadExpenses();
      }
      return { error: updateError };
    },
    [loadExpenses],
  );

  const deleteExpense = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      const { error: deleteError } = await supabase.from('expenses').delete().eq('id', id);
      // expense_payments rows are removed via ON DELETE CASCADE (no orphans).
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
    paymentsByExpense,
    expensePayments,
    loading,
    error,
    refetch: loadExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpense,
  };
}