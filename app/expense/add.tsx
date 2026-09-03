import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
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
import { ScreenState, ScreenStateSkeleton } from '../../components/ui/ScreenState';
import { GlassAvatar, GlassButton, GlassInput } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
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
  const { members, loading: familyLoading, error: familyError, refetch: refetchFamily } = useFamily(user);
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
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  }

  return (
    <ThemedScreen scroll contentContainerStyle={styles.screenContent}>
      <FadeInView delay={0}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Ionicons name="chevron-back" size={iconSizes.md} color={colors.text} />
          </Pressable>
          <ThemedText variant="heading" color={colors.text} style={styles.title}>
            Add Expense
          </ThemedText>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={({ pressed }) => pressed && styles.backButtonPressed}
          >
            <GlassAvatar uri={user?.profile_image_url} name={user?.name} size={44} />
          </Pressable>
        </View>

        <View style={styles.header}>
          <View style={styles.heroWrap}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=85',
              }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroShade} />
          </View>
          <ThemedText variant="body" color={colors.textSecondary} style={styles.intro}>
            Log what you spent and split shared costs with your family in one place —
            so your budget stays clear, fair, and always in sync.
          </ThemedText>
        </View>
      </FadeInView>

      <FadeInView delay={60} style={styles.section}>
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

      <FadeInView delay={120} style={styles.section}>
        <View style={styles.labelRow}>
          <View style={styles.labelIcon}>
            <Ionicons name="grid-outline" size={14} color={colors.accent} />
          </View>
          <ThemedText variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
            Category
          </ThemedText>
        </View>
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

      <FadeInView delay={180} style={styles.section}>
        <View style={styles.labelRow}>
          <View style={styles.labelIcon}>
            <Ionicons name="people-outline" size={14} color={colors.accent} />
          </View>
          <ThemedText variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
            Type
          </ThemedText>
        </View>
        <TypeSelector value={type} onChange={handleTypeChange} />
      </FadeInView>

      {type === 'shared' ? (
        <FadeInView delay={240} style={styles.section}>
          <View style={styles.labelRow}>
            <View style={styles.labelIcon}>
              <Ionicons name="wallet-outline" size={14} color={colors.accent} />
            </View>
            <ThemedText variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
              Paid by
            </ThemedText>
          </View>
          {familyLoading ? (
            <ScreenStateSkeleton rows={2} />
          ) : familyError ? (
            <ScreenState
              compact
              kind="error"
              icon="people-outline"
              title="Couldn't load family members"
              message="We couldn't fetch your family to split this expense."
              actionLabel="Try again"
              actionVariant="secondary"
              onAction={() => refetchFamily()}
            />
          ) : !members.some((m) => m.user_id != null) ? (
            <ScreenState
              compact
              kind="empty"
              icon="people-outline"
              title="No family members yet"
              message="Join your family before recording a shared expense."
            />
          ) : (
            <PaymentSplitSelector
              key={`shared-${splitKey}`}
              type="shared"
              expenseTotal={amountNumber ?? 0}
              currentUserId={user?.id ?? null}
              members={members}
              onChange={handleSplitChange}
            />
          )}
        </FadeInView>
      ) : null}

      <FadeInView delay={300} style={styles.section}>
        <DateField value={date} onChange={(v) => { setDate(v); setTouched(true); setError(null); }} />
      </FadeInView>

      <FadeInView delay={360} style={styles.section}>
        <GlassInput
          label="Note (optional)"
          placeholder="What was this for?"
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={(v) => { setNote(v); setTouched(true); setError(null); }}
          editable={!submitting}
          returnKeyType="done"
          accessibilityLabel="Note"
          inputStyle={styles.noteInput}
        />
      </FadeInView>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <ThemedText variant="caption" color={colors.danger} style={styles.submitError}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.footer}>
        <GlassButton
          title="Save expense"
          loading={submitting}
          loadingTitle="Saving…"
          disabled={!canSave}
          onPress={handleSave}
          leading={<Ionicons name="checkmark-circle-outline" size={iconSizes.md} color={colors.textInverse} />}
        />
      </View>
    </ThemedScreen>
  );
}

function formatRupee(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: spacing.massive + 24,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    pointerEvents: 'none',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  heroWrap: {
    width: '100%',
    height: 160,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 30, 24, 0.30)',
  },
  intro: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionLabel: {
    fontSize: 14,
  },
  labelIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  fieldError: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  noteInput: {
    minHeight: 56,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 130, 145, 0.08)',
  },
  submitError: {
    textAlign: 'center',
    flexShrink: 1,
  },
  footer: {
    paddingBottom: spacing.md,
  },
});