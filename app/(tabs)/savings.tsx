import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { GlassButton, GlassCard, GlassSection } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useSavings } from '../../hooks/useSavings';
import type { SavingsGoal } from '../../types/savings';
import { formatDateLong } from '../../utils/date';
import { formatCurrency } from '../../utils/format';

function isCompleted(goal: SavingsGoal): boolean {
  return goal.target_amount > 0 && goal.current_amount >= goal.target_amount;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export default function SavingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { goals, loading, error, refetch } = useSavings(
    user?.family_id ?? null,
    user?.id ?? null,
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const sortedGoals = useMemo(() => {
    const completed = goals.filter(isCompleted);
    const withDate = goals
      .filter((g) => !isCompleted(g) && g.target_date)
      .sort((a, b) => (a.target_date ?? '').localeCompare(b.target_date ?? ''));
    const withoutDate = goals
      .filter((g) => !isCompleted(g) && !g.target_date)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    const done = completed.sort((a, b) =>
      (b.created_at ?? '').localeCompare(a.created_at ?? ''),
    );
    return [...withDate, ...withoutDate, ...done];
  }, [goals]);

  const summary = useMemo(() => {
    const totalSaved = goals.reduce((acc, goal) => acc + (goal.current_amount ?? 0), 0);
    const totalTarget = goals.reduce((acc, goal) => acc + (goal.target_amount ?? 0), 0);
    const remaining = Math.max(0, totalTarget - totalSaved);
    const progress = clampProgress(totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0);
    return { totalSaved, totalTarget, remaining, progress };
  }, [goals]);

  const openCreate = useCallback(() => {
    router.push('/savings/create');
  }, [router]);

  const openGoal = useCallback(
    (id: string) => {
      router.push({ pathname: '/savings/details', params: { id } });
    },
    [router],
  );

  if (loading) {
    return (
      <ThemedScreen contentContainerStyle={{ paddingBottom: spacing.massive + 92 }}>
        <FadeInView delay={0}>
          <View style={styles.headerBlock}>
            <ThemedText variant="heading" color={colors.text}>
              Savings
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted}>
              Build toward what matters to both of you.
            </ThemedText>
          </View>
        </FadeInView>
        <FadeInView delay={60}>
          <View style={styles.skeletonCard} />
        </FadeInView>
        <FadeInView delay={120}>
          <View style={styles.skeletonCardTall} />
        </FadeInView>
      </ThemedScreen>
    );
  }

  if (error) {
    return (
      <ThemedScreen contentContainerStyle={{ paddingBottom: spacing.massive + 92 }}>
        <FadeInView delay={0}>
          <View style={styles.headerBlock}>
            <ThemedText variant="heading" color={colors.text}>
              Savings
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted}>
              Build toward what matters to both of you.
            </ThemedText>
          </View>
        </FadeInView>
        <FadeInView delay={60}>
          <GlassCard style={styles.stateCard}>
            <ThemedText variant="subheading" color={colors.text}>
              Unable to load savings
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted} style={styles.stateText}>
              We couldn&apos;t load your savings goals.
            </ThemedText>
            <GlassButton
              title="Try again"
              variant="secondary"
              onPress={() => refetch()}
              style={styles.actionButton}
            />
          </GlassCard>
        </FadeInView>
      </ThemedScreen>
    );
  }

  const hasGoals = goals.length > 0;

  return (
    <ThemedScreen scroll contentContainerStyle={{ paddingBottom: spacing.massive + 92 }}>
      <FadeInView delay={0}>
        <View style={styles.headerRow}>
          <View style={styles.headerMeta}>
            <ThemedText variant="heading" color={colors.text}>
              Savings
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted}>
              Build toward what matters to both of you.
            </ThemedText>
          </View>
          <GlassButton
            title="+ New goal"
            variant="secondary"
            onPress={openCreate}
            style={styles.newGoalButton}
          />
        </View>
      </FadeInView>

      {!hasGoals ? (
        <FadeInView delay={60}>
          <GlassCard style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons name="wallet-outline" size={iconSizes.xl} color={colors.accentStrong} />
            </View>
            <ThemedText variant="subheading" color={colors.text}>
              Start saving together
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted} style={styles.stateText}>
              Create your first goal and track the progress as you get closer.
            </ThemedText>
            <GlassButton
              title="Create goal"
              variant="primary"
              onPress={openCreate}
              style={styles.actionButton}
            />
          </GlassCard>
        </FadeInView>
      ) : (
        <>
          <FadeInView delay={60} style={styles.section}>
            <GlassCard>
              <ThemedText variant="caption" color={colors.textMuted}>
                Saved
              </ThemedText>
              <ThemedText variant="title" color={colors.text} style={styles.savedValue}>
                {formatCurrency(summary.totalSaved)}
              </ThemedText>
              <ThemedText variant="caption" color={colors.textMuted}>
                of {formatCurrency(summary.totalTarget)}
              </ThemedText>

              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${summary.progress}%` }]}
                />
              </View>

              <View style={styles.summaryFooter}>
                <ThemedText variant="captionBold" color={colors.accentStrong}>
                  {Math.round(summary.progress)}%
                </ThemedText>
                <ThemedText variant="caption" color={colors.textMuted}>
                  {formatCurrency(summary.remaining)} to go
                </ThemedText>
              </View>
            </GlassCard>
          </FadeInView>

          <GlassSection title="Your goals">
            <FadeInView delay={120}>
              <View style={styles.goalsList}>
                {sortedGoals.map((goal, index) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    index={index}
                    onPress={() => openGoal(goal.id)}
                  />
                ))}
              </View>
            </FadeInView>
          </GlassSection>
        </>
      )}
    </ThemedScreen>
  );
}

function GoalCard({
  goal,
  index,
  onPress,
}: {
  goal: SavingsGoal;
  index: number;
  onPress: () => void;
}) {
  const progress =
    goal.target_amount > 0
      ? Math.min(1, Math.max(0, goal.current_amount / goal.target_amount))
      : 0;
  const percent = clampProgress(progress * 100);
  const remaining = Math.max(0, (goal.target_amount ?? 0) - (goal.current_amount ?? 0));
  const completed = isCompleted(goal);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${goal.name}, ${Math.round(percent)} percent funded, ${formatCurrency(remaining)} remaining`}
      style={({ pressed }) => [styles.goalCardWrap, pressed && styles.pressed]}
    >
      <FadeInView delay={60 + index * 40}>
        <GlassCard padding={spacing.lg}>
          <View style={styles.goalTop}>
            <View style={styles.goalTitleRow}>
              <ThemedText variant="subheading" color={colors.text} numberOfLines={1} style={styles.goalName}>
                {goal.name}
              </ThemedText>
              {completed ? (
                <View style={styles.completeBadge}>
                  <Ionicons name="checkmark-circle" size={iconSizes.xs} color={colors.accentStrong} />
                  <ThemedText variant="label" color={colors.accentStrong}>
                    Complete
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText variant="captionBold" color={colors.accentStrong}>
              {Math.round(percent)}%
            </ThemedText>
          </View>

          <View style={styles.goalProgressTrack}>
            <View style={[styles.goalProgressFill, { width: `${progress * 100}%` }]} />
          </View>

          <View style={styles.goalAmountRow}>
            <ThemedText variant="bodyMedium" color={colors.text}>
              {formatCurrency(goal.current_amount)}
              <ThemedText variant="bodyMedium" color={colors.textMuted}>
                {' '}/ {formatCurrency(goal.target_amount)}
              </ThemedText>
            </ThemedText>
          </View>
          <ThemedText variant="caption" color={colors.textMuted}>
            {completed ? 'Goal reached' : `${formatCurrency(remaining)} to go`}
            {goal.target_date ? ` · Target: ${formatDateLong(goal.target_date)}` : ''}
          </ThemedText>
        </GlassCard>
      </FadeInView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerMeta: {
    flex: 1,
  },
  headerBlock: {
    marginBottom: spacing.lg,
  },
  newGoalButton: {
    minWidth: 44,
    minHeight: 44,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  savedValue: {
    marginTop: spacing.xs,
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
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  goalsList: {
    gap: spacing.md,
  },
  goalCardWrap: {
    borderRadius: radius.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  goalTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  goalName: {
    flexShrink: 1,
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
  goalProgressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  goalAmountRow: {
    marginTop: spacing.md,
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
  actionButton: {
    marginTop: spacing.lg,
    minWidth: 140,
  },
  skeletonCard: {
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  skeletonCardTall: {
    height: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
});
