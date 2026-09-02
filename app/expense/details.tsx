import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { CategoryIcon } from '../../components/dashboard/CategoryIcon';
import { AmountInput, parseAmount } from '../../components/expense/AmountInput';
import { CategorySelector } from '../../components/expense/CategorySelector';
import { DateField } from '../../components/expense/DateField';
import { PaidBySelector, type PayerOption } from '../../components/expense/PaidBySelector';
import { TypeSelector } from '../../components/expense/TypeSelector';
import { GlassButton, GlassCard, GlassInput, GlassModal, GlassSection } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import { useFamily } from '../../hooks/useFamily';
import { isSupabaseConfigured } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';
import { formatDateLong } from '../../utils/date';
import {
  CONFIG_ERROR,
  mapActionError,
} from '../../utils/errors';
import type { ExpenseCategory, ExpenseType } from '../../types/expense';

const MIN_SUBMIT_VISIBLE_MS = 350;

export default function ExpenseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { members } = useFamily(user);
  const { expense, getExpense, updateExpense, deleteExpense } = useExpenses(
    user?.family_id ?? null,
    user?.id ?? null,
  );

  const [expenseLoading, setExpenseLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [type, setType] = useState<ExpenseType>('personal');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  const loadExpense = useCallback(async () => {
    if (!id) {
      setExpenseLoading(false);
      return;
    }
    setExpenseLoading(true);
    const { error: err } = await getExpense(id);
    setExpenseLoading(false);
    if (err) {
      setError(err.message);
    }
  }, [id, getExpense]);

  useEffect(() => {
    loadExpense();
  }, [loadExpense]);

  useEffect(() => {
    if (expense && !editing) {
      setAmount(String(expense.amount));
      setCategory(expense.category as ExpenseCategory);
      setType(expense.type);
      setPaidBy(expense.paid_by);
      setDate(expense.date);
      setNote(expense.note ?? '');
      setTouched(false);
      setError(null);
    }
  }, [expense, editing]);

  const paidByMember = useMemo(
    () => members.find((m) => m.user_id === paidBy) ?? null,
    [members, paidBy],
  );

  const partner = useMemo(
    () => members.find((m) => m.user_id !== user?.id) ?? null,
    [members, user?.id],
  );

  const partnerOption = useMemo<PayerOption | null>(
    () => (partner ? { id: partner.id, label: partner.user?.name ?? 'Partner' } : null),
    [partner],
  );

  const canEdit = expense?.user_id === user?.id;

  const amountNumber = parseAmount(amount);
  const amountHasText = amount.trim().length > 0;
  const amountInvalid = amountHasText && (amountNumber === null || amountNumber <= 0);
  const showAmountError = amountInvalid || (touched && !amountHasText);
  const showCategoryError = touched && !category;

  const canSave = amountHasText && amountNumber !== null && amountNumber > 0 && category !== null;

  async function handleSave() {
    if (submitting || !id || !expense) {
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
      saveError = 'Please sign in to edit expenses.';
    } else if (!canEdit) {
      saveError = 'You do not have permission to edit this expense.';
    } else {
      const trimmedNote = note.trim();
      const { error: dbError } = await updateExpense(id, {
        amount: parsedAmount,
        category,
        type,
        paid_by: type === 'personal' ? user.id : (paidBy || user.id),
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
    setEditing(false);
  }

  async function handleDelete() {
    if (!id || !expense) {
      return;
    }
    setDeleting(true);
    const { error: dbError } = await deleteExpense(id);
    setDeleting(false);
    setDeleteConfirmOpen(false);

    if (dbError) {
      setError(mapActionError(dbError, 'delete'));
      return;
    }
    router.back();
  }

  if (expenseLoading) {
    return (
      <ThemedScreen>
        <View style={styles.centered}>
          <ThemedText variant="caption" color={colors.textMuted}>
            Loading expense…
          </ThemedText>
        </View>
      </ThemedScreen>
    );
  }

  if (!expense) {
    return (
      <ThemedScreen>
        <View style={styles.centered}>
          <ThemedText variant="heading" color={colors.text}>
            Expense not found
          </ThemedText>
          <ThemedText variant="body" color={colors.textSecondary} style={styles.subtitle}>
            {error ?? 'This expense may have been removed or you may not have access to it.'}
          </ThemedText>
          <GlassButton
            title="Go back"
            variant="secondary"
            onPress={() => router.back()}
            style={styles.goBackButton}
          />
        </View>
      </ThemedScreen>
    );
  }

  const typeLabel = type === 'personal' ? 'Personal' : 'Shared';

  return (
    <ThemedScreen scroll contentContainerStyle={{ paddingBottom: spacing.massive + 92 }}>
      <FadeInView delay={0} style={styles.section}>
        <ThemedText variant="caption" color={colors.textMuted}>
          {formatDateLong(expense.date)}
        </ThemedText>
      </FadeInView>

      {!editing ? (
        <>
          <FadeInView delay={60} style={styles.section}>
            <GlassCard style={styles.summaryCard}>
              <CategoryIcon category={expense.category} size={48} />
              <View style={styles.summaryInfo}>
                <ThemedText variant="heading" color={colors.text}>
                  {expense.category}
                </ThemedText>
                <ThemedText variant="body" color={colors.textSecondary} style={styles.typeBadge}>
                  {typeLabel}
                </ThemedText>
              </View>
              <ThemedText variant="heading" color={colors.text}>
                {formatCurrency(expense.amount)}
              </ThemedText>
            </GlassCard>
          </FadeInView>

          {error ? (
            <ThemedText variant="caption" color={colors.danger} style={styles.submitError}>
              {error}
            </ThemedText>
          ) : null}

          <FadeInView delay={120} style={styles.section}>
            <GlassSection title="Details">
              <View style={styles.row}>
                <ThemedText variant="body" color={colors.textSecondary}>Paid by</ThemedText>
                <ThemedText variant="body" color={colors.text}>
                  {paidByMember ? (paidByMember.user?.name ?? 'Partner') : 'Partner'}
                </ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText variant="body" color={colors.textSecondary}>Date</ThemedText>
                <ThemedText variant="body" color={colors.text}>
                  {formatDateLong(expense.date)}
                </ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText variant="body" color={colors.textSecondary}>Note</ThemedText>
                <ThemedText variant="body" color={colors.text}>
                  {expense.note ?? 'No note'}
                </ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText variant="body" color={colors.textSecondary}>Created</ThemedText>
                <ThemedText variant="body" color={colors.text}>
                  {formatDateLong(expense.created_at)}
                </ThemedText>
              </View>
            </GlassSection>
          </FadeInView>

          {canEdit ? (
            <FadeInView delay={180} style={styles.section}>
              <GlassButton
                title="Edit expense"
                onPress={() => setEditing(true)}
                variant="secondary"
                style={styles.editButton}
              />
            </FadeInView>
          ) : null}

          {canEdit ? (
            <FadeInView delay={240} style={styles.section}>
              <Pressable
                onPress={() => setDeleteConfirmOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Delete expense"
              >
                <ThemedText variant="caption" color={colors.danger} style={styles.deleteText}>
                  Delete expense
                </ThemedText>
              </Pressable>
            </FadeInView>
          ) : null}
        </>
      ) : null}

      {editing && (
        <>
          {error ? (
            <ThemedText variant="caption" color={colors.danger} style={styles.submitError}>
              {error}
            </ThemedText>
          ) : null}

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
            <TypeSelector value={type} onChange={(next) => { setType(next); setTouched(true); setError(null); }} />
          </FadeInView>

          {type === 'shared' ? (
            <FadeInView delay={180} style={styles.section}>
              <ThemedText variant="label" color={colors.textSecondary} style={styles.label}>
                Paid by
              </ThemedText>
              <PaidBySelector
                type={type}
                payerId={paidBy}
                userId={user?.id ?? null}
                partner={partnerOption}
                onSelect={(id) => { setPaidBy(id); setTouched(true); setError(null); }}
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

          <View style={styles.footer}>
            <GlassButton
              title="Save changes"
              loading={submitting}
              loadingTitle="Saving…"
              disabled={!canSave}
              onPress={handleSave}
              style={styles.saveButton}
            />
          </View>
        </>
      )}

      <GlassModal
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        presentationStyle="center"
      >
        <ThemedText variant="heading" color={colors.text}>
          Delete expense?
        </ThemedText>
        <ThemedText variant="body" color={colors.textSecondary} style={styles.modalBody}>
          This cannot be undone. {formatCurrency(expense.amount)} from {expense.category} will be removed.
        </ThemedText>
        <View style={styles.modalActions}>
          <GlassButton
            title="Cancel"
            variant="secondary"
            onPress={() => setDeleteConfirmOpen(false)}
            disabled={deleting}
            style={styles.modalButton}
          />
          <GlassButton
            title="Delete"
            variant="destructive"
            loading={deleting}
            loadingTitle="Deleting…"
            onPress={handleDelete}
            style={styles.modalButton}
          />
        </View>
      </GlassModal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  goBackButton: {
    marginTop: spacing.xl,
    minWidth: 44,
    minHeight: 44,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  summaryInfo: {
    flex: 1,
  },
  typeBadge: {
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
  editButton: {
    marginTop: spacing.sm,
  },
  deleteText: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    paddingBottom: spacing.md,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
  modalBody: {
    marginVertical: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  modalButton: {
    minWidth: 100,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
});