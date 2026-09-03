import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { AmountInput, parseAmount } from '../../components/expense/AmountInput';
import { CategorySelector } from '../../components/expense/CategorySelector';
import { DateField } from '../../components/expense/DateField';
import {
  PaymentSplitSelector,
  type PaymentSplitState,
  type SplitValidation,
} from '../../components/expense/PaymentSplitSelector';
import { TypeSelector } from '../../components/expense/TypeSelector';
import { GlassButton, GlassInput } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import { useFamily } from '../../hooks/useFamily';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { ExpenseAllocation, ExpenseCategory, ExpenseType } from '../../types/expense';
import { toISODate } from '../../utils/date';
import {
  CONFIG_ERROR,
  FAMILY_ERROR,
  mapActionError,
} from '../../utils/errors';

const MIN_SUBMIT_VISIBLE_MS = 350;

const DEFAULT_VALIDATION: SplitValidation = { total: 0, remaining: 0, valid: false, over: false };

export default function AddExpenseScreen() {
  const { user } = useAuth();
  const { members } = useFamily(user);
  const { addExpense } = useExpenses(user?.family_id ?? null, user?.id ?? null);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [type, setType] = useState<ExpenseType>('personal');
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared expense split: allocations + validity, reported by the selector.
  const [allocations, setAllocations] = useState<ExpenseAllocation[]>([]);
  const [splitValidation, setSplitValidation] = useState<SplitValidation>(DEFAULT_VALIDATION);
  const [splitKey, setSplitKey] = useState('initial');

  function handleTypeChange(next: ExpenseType) {
    setType(next);
    setTouched(true);
    setError(null);
    if (next === 'personal') {
      setAllocations([]);
      setSplitValidation({ total: 0, remaining: 0, valid: true, over: false });
    } else {
      // Re-seed the split selector for a fresh smart default.
      setSplitKey(`type-${next}-${Date.now()}`);
    }
  }

  const amountNumber = parseAmount(amount);
  const amountHasText = amount.trim().length > 0;
  const amountInvalid = amountHasText && (amountNumber === null || amountNumber <= 0);
  const showAmountError = amountInvalid || (touched && !amountHasText);
  const showCategoryError = touched && !category;

  // A shared expense may only be saved when its payment split exactly equals
  // the expense total. Personal expenses are always valid (single payer = you).
  const splitValid = type === 'shared' ? splitValidation.valid : true;

  const canSave =
    amountHasText && amountNumber !== null && amountNumber > 0 && category !== null && splitValid;

  function handleSplitChange(state: PaymentSplitState) {
    setAllocations(state.allocations);
    setSplitValidation(state.validation);
  }

  async function handleSave() {
    if (submitting) {
      return;
    }
    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null || parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!category) {
      setError('Please select a category.');
      return;
    }

    // Build the payer allocations.
    let payments: ExpenseAllocation[];
    if (type === 'personal') {
      if (!user?.id) {
        setError('Please sign in to save an expense.');
        return;
      }
      payments = [{ user_id: user.id, amount: parsedAmount }];
    } else {
      payments = allocations;
      if (payments.length === 0) {
        setError('Add at least one payer with a positive amount.');
        return;
      }
      const total = payments.reduce((acc, p) => acc + p.amount, 0);
      if (Math.round(total * 100) !== Math.round(parsedAmount * 100)) {
        setError(
          total < parsedAmount
            ? `Payment split is ${formatRupee(parsedAmount - total)} short.`
            : `Payment split exceeds the expense by ${formatRupee(total - parsedAmount)}.`,
        );
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    const startedAt = Date.now();

    let saveError: string | null = null;
    if (!isSupabaseConfigured) {
      saveError = CONFIG_ERROR;
    } else if (!user?.id) {
      saveError = 'Please sign in to save an expense.';
    } else if (!user.family_id) {
      saveError = FAMILY_ERROR;
    } else {
      const trimmedNote = note.trim();
      const { error: dbError } = await addExpense({
        amount: parsedAmount,
        category,
        type,
        date,
        note: trimmedNote ? trimmedNote : undefined,
        payments,
      });
      saveError = dbError ? mapActionError(dbError) : null;
    }

    const remaining = MIN_SUBMIT_VISIBLE_MS - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    setSubmitting(false);

    if (saveError) {
      setError(saveError);
      return;
    }
    router.back();
  }

  return (
    <ThemedScreen scroll>
      <ThemedText variant="caption" color={colors.textMuted} style={styles.supporting}>
        Keep your shared money space up to date.
      </ThemedText>

      <FadeInView delay={0} style={styles.section}>
        <AmountInput
          value={amount}
          onChangeText={(v) => { setAmount(v); setTouched(true); setError(null); }}
        />
        {showAmountError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            Please enter a valid amount.
          </ThemedText>
        ) : null}
      </FadeInView>

      <FadeInView delay={60} style={styles.section}>
        <ThemedText variant="label" color={colors.textSecondary} style={styles.label}>
          Category
        </ThemedText>
        <CategorySelector
          selected={category}
          onSelect={(c) => { setCategory(c); setTouched(true); setError(null); }}
        />
        {showCategoryError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            Please select a category.
          </ThemedText>
        ) : null}
      </FadeInView>

      <FadeInView delay={120} style={styles.section}>
        <ThemedText variant="label" color={colors.textSecondary} style={styles.label}>
          Type
        </ThemedText>
        <TypeSelector value={type} onChange={handleTypeChange} />
      </FadeInView>

      {type === 'shared' ? (
        <FadeInView delay={180} style={styles.section}>
          <ThemedText variant="label" color={colors.textSecondary} style={styles.label}>
            Paid by
          </ThemedText>
          <PaymentSplitSelector
            key={`shared-${splitKey}`}
            type="shared"
            expenseTotal={amountNumber ?? 0}
            currentUserId={user?.id ?? null}
            members={members}
            onChange={handleSplitChange}
          />
        </FadeInView>
      ) : null}

      <FadeInView delay={240} style={styles.section}>
        <DateField value={date} onChange={(v) => { setDate(v); setTouched(true); setError(null); }} />
      </FadeInView>

      <FadeInView delay={300} style={styles.section}>
        <GlassInput
          label="Note (optional)"
          placeholder="What was this for?"
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={(v) => { setNote(v); setTouched(true); setError(null); }}
          editable={!submitting}
          returnKeyType="done"
          accessibilityLabel="Note"
        />
      </FadeInView>

      {error ? (
        <ThemedText variant="caption" color={colors.danger} style={styles.submitError}>
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.footer}>
        <GlassButton
          title="Add expense"
          loading={submitting}
          loadingTitle="Adding…"
          disabled={!canSave}
          onPress={handleSave}
        />
      </View>
    </ThemedScreen>
  );
}

function formatRupee(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

const styles = StyleSheet.create({
  supporting: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  fieldError: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  submitError: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  footer: {
    paddingBottom: spacing.md,
  },
});