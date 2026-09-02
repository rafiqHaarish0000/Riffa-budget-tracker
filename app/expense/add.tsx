import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { AmountInput, parseAmount } from '../../components/expense/AmountInput';
import { CategorySelector } from '../../components/expense/CategorySelector';
import { DateField } from '../../components/expense/DateField';
import { PaidBySelector } from '../../components/expense/PaidBySelector';
import { TypeSelector } from '../../components/expense/TypeSelector';
import { GlassButton, GlassInput } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import { useFamily } from '../../hooks/useFamily';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { ExpenseCategory, ExpenseType } from '../../types/expense';
import { toISODate } from '../../utils/date';
import {
  CONFIG_ERROR,
  FAMILY_ERROR,
  GENERIC_ERROR,
  mapActionError,
  PERMISSION_ERROR,
  AUTH_ERROR,
} from '../../utils/errors';

const MIN_SUBMIT_VISIBLE_MS = 350;

export default function AddExpenseScreen() {
  const { user } = useAuth();
  const { members } = useFamily(user);
  const { addExpense } = useExpenses(user?.family_id ?? null, user?.id ?? null);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [type, setType] = useState<ExpenseType>('personal');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partner = useMemo(() => {
    const other = members.find((member) => member.user_id !== user?.id);
    if (!other) {
      return null;
    }
    return { id: other.user_id, label: other.user?.name ?? 'Partner' };
  }, [members, user?.id]);

  useEffect(() => {
    if (user?.id && !paidBy) {
      setPaidBy(user.id);
    }
  }, [user?.id, paidBy]);

  function handleTypeChange(next: ExpenseType) {
    setType(next);
    setTouched(true);
    setError(null);
    if (next === 'personal') {
      setPaidBy(user?.id ?? '');
    } else if (!paidBy) {
      setPaidBy(user?.id ?? '');
    }
  }

  const amountNumber = parseAmount(amount);
  const amountHasText = amount.trim().length > 0;
  const amountInvalid = amountHasText && (amountNumber === null || amountNumber <= 0);
  const showAmountError = amountInvalid || (touched && !amountHasText);
  const showCategoryError = touched && !category;

  const canSave =
    amountHasText && amountNumber !== null && amountNumber > 0 && category !== null;

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
        // Personal expenses can only ever be paid by the authenticated user.
        paid_by: paidBy || user.id,
        date,
        ...(trimmedNote ? { note: trimmedNote } : {}),
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
        <AmountInput value={amount} onChangeText={(v) => { setAmount(v); setTouched(true); setError(null); }} />
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

      <FadeInView delay={180} style={styles.section}>
        <ThemedText variant="label" color={colors.textSecondary} style={styles.label}>
          Paid by
        </ThemedText>
        <PaidBySelector
          type={type}
          payerId={paidBy}
          userId={user?.id ?? null}
          partner={partner}
          onSelect={(id) => { setPaidBy(id); setTouched(true); setError(null); }}
        />
      </FadeInView>

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