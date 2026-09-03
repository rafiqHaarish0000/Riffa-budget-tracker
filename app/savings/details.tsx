import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { AmountInput, parseAmount } from '../../components/expense/AmountInput';
import { DateField } from '../../components/expense/DateField';
import { GlassButton, GlassCard, GlassModal, GlassSection } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { ScreenState, ScreenStateSkeleton } from '../../components/ui/ScreenState';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useSavings } from '../../hooks/useSavings';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { SavingsContributionWithUser } from '../../types/savings';
import { formatDateLong, toISODate } from '../../utils/date';
import { formatCurrency } from '../../utils/format';

const MIN_SUBMIT_VISIBLE_MS = 350;

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

function formatContribDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function contributorName(contrib: SavingsContributionWithUser, currentUserId: string | null): string {
  if (contrib.user?.id && contrib.user.id === currentUserId) {
    return 'You';
  }
  return contrib.user?.name ?? 'Family member';
}

export default function SavingsDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const {
    goals,
    loading: goalsLoading,
    error: goalsError,
    refetch,
    addContribution,
    deleteGoal,
    contributionsForGoal,
  } = useSavings(user?.family_id ?? null, user?.id ?? null);

  const [contributions, setContributions] = useState<SavingsContributionWithUser[]>([]);
  const [contribLoading, setContribLoading] = useState(false);
  const [contribError, setContribError] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [touched, setTouched] = useState(false);
  const [adding, setAdding] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const validId = typeof goalId === 'string' && goalId.trim().length > 0;

  const goal = useMemo(
    () => (validId ? goals.find((g) => g.id === goalId) ?? null : null),
    [goals, goalId, validId],
  );

  const loadContributions = useCallback(async () => {
    if (!goalId) {
      return;
    }
    setContribLoading(true);
    const { data, error } = await contributionsForGoal(goalId);
    setContribLoading(false);
    if (error) {
      setContribError('Unable to load contributions.');
      return;
    }
    setContribError(null);
    setContributions(data);
  }, [goalId, contributionsForGoal]);

  useEffect(() => {
    if (validId && goal) {
      loadContributions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId, goal?.id]);

  const target = goal?.target_amount ?? 0;
  const current = goal?.current_amount ?? 0;
  const progress = clampProgress(target > 0 ? (current / target) * 100 : 0);
  const remaining = Math.max(0, target - current);
  const completed = target > 0 && current >= target;

  const amountNumber = parseAmount(amount);
  const amountHasText = amount.trim().length > 0;
  const amountInvalid = amountHasText && (amountNumber === null || amountNumber <= 0);
  const overRemaining =
    goal !== null && amountNumber !== null && !completed && amountNumber > remaining;
  const showAmountError = touched && (!amountHasText || amountInvalid);
  const showOverRemaining = touched && overRemaining;
  const canAdd =
    goal !== null &&
    !completed &&
    amountHasText &&
    amountNumber !== null &&
    amountNumber > 0 &&
    !overRemaining;

  function openSheet() {
    setAmount('');
    setDate(toISODate(new Date()));
    setTouched(false);
    setSheetError(null);
    setSheetOpen(true);
  }

  async function handleAdd() {
    if (adding || !goal || !goalId) {
      return;
    }
    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null || parsedAmount <= 0) {
      setSheetError('Please enter a valid amount.');
      return;
    }
    if (completed) {
      setSheetError('This goal is already fully funded.');
      return;
    }
    if (parsedAmount > remaining) {
      setSheetError('That contribution is greater than the remaining amount.');
      return;
    }

    setSheetError(null);
    setAdding(true);
    const startedAt = Date.now();

    let addError: string | null = null;
    if (!isSupabaseConfigured) {
      addError =
        "Savings isn't connected yet. Add your Supabase configuration to manage contributions.";
    } else if (!user?.id) {
      addError = 'Please sign in to add contributions.';
    } else {
      const { error: dbError } = await addContribution({
        goal_id: goalId,
        amount: parsedAmount,
        date,
      });
      addError = dbError ? mapContributionError(dbError) : null;
    }

    const remainingMs = MIN_SUBMIT_VISIBLE_MS - (Date.now() - startedAt);
    if (remainingMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingMs));
    }
    setAdding(false);

    if (addError) {
      setSheetError(addError);
      return;
    }
    setAmount('');
    setTouched(false);
    setSheetOpen(false);
    await loadContributions();
  }

  async function handleDelete() {
    if (deleting || !goalId) {
      return;
    }
    setDeleting(true);
    const { error: dbError } = await deleteGoal(goalId);
    setDeleting(false);
    setDeleteConfirmOpen(false);
    if (dbError) {
      setActionError(mapGoalError(dbError));
      return;
    }
    router.back();
  }

  if (!validId) {
    return (
      <NotFoundState
        title="Savings goal not found"
        description="This goal may have been removed or you may not have access to it."
        onBack={() => router.back()}
      />
    );
  }

  if (goalsLoading) {
    return (
      <ThemedScreen scroll>
        <FadeInView delay={0}>
          <ScreenStateSkeleton tall style={styles.skeleton} />
        </FadeInView>
        <FadeInView delay={80}>
          <ScreenStateSkeleton rows={3} />
        </FadeInView>
      </ThemedScreen>
    );
  }

  if (goalsError || !goal) {
    return (
      <NotFoundState
        title={goalsError ? 'Unable to load this savings goal.' : 'Savings goal not found'}
        description={
          goalsError
            ? 'Please try again.'
            : 'This goal may have been removed or you may not have access to it.'
        }
        onBack={() => router.back()}
        onRetry={goalsError ? refetch : undefined}
      />
    );
  }

  return (
    <ThemedScreen scroll keyboardShouldPersistTaps="handled">
      <FadeInView delay={0}>
        <GlassCard style={styles.headerCard}>
          <View style={styles.headerTop}>
            <ThemedText variant="subheading" color={colors.text} numberOfLines={2} style={styles.goalName}>
              {goal.name}
            </ThemedText>
            {completed ? (
              <View style={styles.completeBadge}>
                <Ionicons name="checkmark-circle" size={iconSizes.xs} color={colors.accentStrong} />
                <ThemedText variant="label" color={colors.accentStrong}>
                  Goal reached
                </ThemedText>
              </View>
            ) : null}
          </View>

          <ThemedText variant="title" color={colors.text} style={styles.savedValue}>
            {formatCurrency(current)}
          </ThemedText>
          <ThemedText variant="caption" color={colors.textMuted}>
            saved of {formatCurrency(target)}
          </ThemedText>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                completed && styles.progressFillDone,
                { width: `${progress}%` },
              ]}
            />
          </View>

          <View style={styles.progressMeta}>
            <ThemedText variant="captionBold" color={colors.accentStrong}>
              {Math.round(progress)}%
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted}>
              {formatCurrency(remaining)} to go
            </ThemedText>
          </View>

          {goal.target_date ? (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={iconSizes.sm} color={colors.textMuted} />
              <ThemedText variant="caption" color={colors.textMuted}>
                Target: {formatDateLong(goal.target_date)}
              </ThemedText>
            </View>
          ) : null}
          {goal.monthly_target ? (
            <View style={styles.metaRow}>
              <Ionicons name="trending-up-outline" size={iconSizes.sm} color={colors.textMuted} />
              <ThemedText variant="caption" color={colors.textMuted}>
                Monthly target: {formatCurrency(goal.monthly_target)}
              </ThemedText>
            </View>
          ) : null}
        </GlassCard>
      </FadeInView>

      <FadeInView delay={60} style={styles.actionSection}>
        {completed ? (
          <GlassButton
            title="Goal reached"
            variant="secondary"
            disabled
            style={styles.primaryButton}
          />
        ) : (
          <GlassButton
            title="Add contribution"
            onPress={openSheet}
            style={styles.primaryButton}
          />
        )}
        <GlassButton
          title="Delete goal"
          variant="ghost"
          onPress={() => {
            setActionError(null);
            setDeleteConfirmOpen(true);
          }}
          style={styles.deleteButton}
        />
        {actionError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.inlineError}>
            {actionError}
          </ThemedText>
        ) : null}
      </FadeInView>

      <GlassSection title="Contribution history">
        {contribLoading ? (
          <FadeInView delay={0}>
            <View style={styles.skeletonRow} />
            <View style={styles.skeletonRow} />
          </FadeInView>
        ) : contribError ? (
          <GlassCard style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={iconSizes.xl} color={colors.textMuted} />
            <ThemedText variant="body" color={colors.textMuted} style={styles.stateText}>
              {contribError}
            </ThemedText>
            <GlassButton
              title="Try again"
              variant="secondary"
              onPress={loadContributions}
              style={styles.stateButton}
            />
          </GlassCard>
        ) : contributions.length === 0 ? (
          <GlassCard style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons name="wallet-outline" size={iconSizes.xl} color={colors.accentStrong} />
            </View>
            <ThemedText variant="subheading" color={colors.text}>
              No contributions yet
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted} style={styles.stateText}>
              Your first contribution will appear here.
            </ThemedText>
            {!completed ? (
              <GlassButton
                title="Add contribution"
                onPress={openSheet}
                style={styles.stateButton}
              />
            ) : null}
          </GlassCard>
        ) : (
          <FadeInView delay={0}>
            <View style={styles.contribList}>
              {contributions.map((contrib) => (
                <GlassCard key={contrib.id} padding={spacing.lg} style={styles.contribCard}>
                  <View style={styles.contribMain}>
                    <ThemedText variant="bodyMedium" color={colors.text}>
                      {formatCurrency(contrib.amount)}
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.textMuted}>
                      {formatContribDate(contrib.date)} ·{' '}
                      {contributorName(contrib, user?.id ?? null)}
                    </ThemedText>
                  </View>
                </GlassCard>
              ))}
            </View>
          </FadeInView>
        )}
      </GlassSection>

      <GlassModal
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        presentationStyle="bottomSheet"
      >
        <ThemedText variant="heading" color={colors.text} style={styles.sheetTitle}>
          Add contribution
        </ThemedText>
        <ThemedText variant="caption" color={colors.textMuted} style={styles.sheetSubtitle}>
          {formatCurrency(remaining)} remaining
        </ThemedText>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.sheetScroller}
        >
          <FadeInView delay={0}>
            <AmountInput
              label="Amount"
              value={amount}
              onChangeText={(v) => {
                setAmount(v);
                setTouched(true);
                setSheetError(null);
              }}
              editable={!adding}
            />
            {showAmountError ? (
              <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
                Please enter a valid amount.
              </ThemedText>
            ) : null}
            {showOverRemaining ? (
              <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
                That contribution is greater than the remaining amount.
              </ThemedText>
            ) : null}
          </FadeInView>

          <FadeInView delay={60} style={styles.sheetField}>
            <DateField
              value={date}
              onChange={(v) => {
                setDate(v);
                setTouched(true);
                setSheetError(null);
              }}
            />
          </FadeInView>

          {sheetError ? (
            <ThemedText variant="caption" color={colors.danger} style={styles.sheetError}>
              {sheetError}
            </ThemedText>
          ) : null}

          <GlassButton
            title="Add"
            loading={adding}
            loadingTitle="Adding…"
            disabled={!canAdd}
            onPress={handleAdd}
            style={styles.sheetSubmit}
          />
        </ScrollView>
      </GlassModal>

      <GlassModal
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        presentationStyle="center"
      >
        <ThemedText variant="heading" color={colors.text}>
          Delete goal?
        </ThemedText>
        <ThemedText variant="body" color={colors.textSecondary} style={styles.modalBody}>
          This goal and its contribution history will be removed. This cannot be undone.
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

function NotFoundState({
  title,
  description,
  onBack,
  onRetry,
}: {
  title: string;
  description?: string;
  onBack: () => void;
  onRetry?: () => void;
}) {
  return (
    <ThemedScreen>
      <ScreenState
        kind="error"
        icon="wallet-outline"
        title={title}
        message={description}
        actionLabel="Go back"
        actionVariant="secondary"
        onAction={onBack}
        secondaryActionLabel={onRetry ? 'Try again' : undefined}
        secondaryAction={onRetry}
      />
    </ThemedScreen>
  );
}

function mapContributionError(error: Error): string {
  const message = error.message;
  if (!isSupabaseConfigured || message.includes('[supabase]') || /not configured/i.test(message)) {
    return "Savings isn't connected yet. Add your Supabase configuration to manage contributions.";
  }
  if (/(permission|rls|policy|row.level)/i.test(message)) {
    return "You don't have permission to add this contribution.";
  }
  if (/(failed to fetch|network|timeout|socket)/i.test(message)) {
    return 'Unable to add contribution. Please try again.';
  }
  return 'Unable to add contribution. Please try again.';
}

function mapGoalError(error: Error): string {
  const message = error.message;
  if (!isSupabaseConfigured || message.includes('[supabase]') || /not configured/i.test(message)) {
    return "Savings isn't connected yet. Add your Supabase configuration to manage goals.";
  }
  if (/(permission|rls|policy|row.level)/i.test(message)) {
    return "You don't have permission to update this goal.";
  }
  if (/(failed to fetch|network|timeout|socket)/i.test(message)) {
    return 'Unable to update this goal. Please try again.';
  }
  return 'Unable to update this goal. Please try again.';
}

const styles = StyleSheet.create({
  headerCard: {
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  goalName: {
    flex: 1,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  savedValue: {
    marginBottom: spacing.xxs,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  progressFillDone: {
    backgroundColor: colors.accentStrong,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionSection: {
    marginBottom: spacing.xxl,
  },
  primaryButton: {
    minHeight: 50,
  },
  deleteButton: {
    marginTop: spacing.sm,
    minHeight: 44,
  },
  inlineError: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  contribList: {
    gap: spacing.md,
  },
  contribCard: {
    flexDirection: 'row',
  },
  contribMain: {
    flex: 1,
  },
  stateCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stateText: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  stateButton: {
    marginTop: spacing.lg,
    minWidth: 160,
  },
  sheetTitle: {
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    marginBottom: spacing.lg,
  },
  sheetScroller: {
    flexGrow: 0,
    maxHeight: 460,
  },
  sheetField: {
    marginTop: spacing.lg,
  },
  sheetError: {
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  sheetSubmit: {
    marginTop: spacing.xl,
  },
  fieldError: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  modalBody: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  skeleton: {
    marginBottom: spacing.lg,
  },
  skeletonRow: {
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
});
