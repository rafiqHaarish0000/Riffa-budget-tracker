import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { ProgressRing } from '../../components/savings/ProgressRing';
import { GlassButton, GlassCard, GlassSection } from '../../components/ui/glass';
import { ScreenState } from '../../components/ui/ScreenState';
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
          <View style={styles.headerRow}>
            <View style={styles.headerMeta}>
              <ThemedText variant="heading" color={colors.text}>
                Savings
              </ThemedText>
              <ThemedText variant="caption" color={colors.textMuted}>
                Build toward what matters to both of you.
              </ThemedText>
            </View>
            <View style={styles.skeletonNewGoal} />
          </View>
        </FadeInView>
        <FadeInView delay={60}>
          <SavingsSkeleton />
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
          <ScreenState
            kind="error"
            title="Unable to load savings"
            message="We couldn&apos;t load your savings goals."
            actionLabel="Try again"
            actionVariant="secondary"
            onAction={() => refetch()}
          />
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
          <ScreenState
            kind="empty"
            icon="wallet-outline"
            title="Start saving together"
            message="Create your first goal and track the progress as you get closer."
            actionLabel="Create goal"
            onAction={openCreate}
          />
        </FadeInView>
      ) : (
        <>
          <FadeInView delay={60} style={styles.section}>
            <LinearGradient
              colors={['#17422F', '#0B201B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroTop}>
                <View>
                  <ThemedText variant="label" color={colors.textMuted} style={styles.heroEyebrow}>
                    TOTAL SAVED
                  </ThemedText>
                  <ThemedText variant="body" color={colors.textSecondary}>
                    across {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
                  </ThemedText>
                </View>
                <View style={styles.heroBadge}>
                  <ThemedText variant="captionBold" color={colors.textInverse}>
                    {Math.round(summary.progress)}%
                  </ThemedText>
                </View>
              </View>

              <ProgressRing
                progress={summary.progress / 100}
                size={188}
                thickness={18}
                centerValue={formatCurrency(summary.totalSaved)}
                centerCaption={formatCurrency(summary.totalTarget)}
              />

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <ThemedText variant="caption" color={colors.textMuted}>
                    Goal target
                  </ThemedText>
                  <ThemedText variant="bodyMedium" color={colors.text}>
                    {formatCurrency(summary.totalTarget)}
                  </ThemedText>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <ThemedText variant="caption" color={colors.textMuted}>
                    Remaining
                  </ThemedText>
                  <ThemedText variant="bodyMedium" color={colors.accentStrong}>
                    {formatCurrency(summary.remaining)}
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
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
            <ProgressRing
              progress={progress}
              size={54}
              thickness={6}
              color={completed ? colors.accentStrong : colors.accent}
              centerValue={`${Math.round(percent)}`}
              centerCaption="%"
            />
            <View style={styles.goalBody}>
              <View style={styles.goalTitleRow}>
                <ThemedText variant="subheading" color={colors.text} numberOfLines={1} style={styles.goalName}>
                  {goal.name}
                </ThemedText>
                {completed ? (
                  <View style={styles.completeBadge}>
                    <Ionicons name="checkmark-circle" size={iconSizes.xs} color={colors.accentStrong} />
                    <ThemedText variant="label" color={colors.accentStrong}>
                      Done
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText variant="bodyMedium" color={colors.text}>
                {formatCurrency(goal.current_amount)}
                <ThemedText variant="caption" color={colors.textMuted}>
                  {' '}/ {formatCurrency(goal.target_amount)}
                </ThemedText>
              </ThemedText>
              <ThemedText variant="caption" color={colors.textMuted}>
                {completed ? 'Goal reached' : `${formatCurrency(remaining)} to go`}
                {goal.target_date ? ` · ${formatDateLong(goal.target_date)}` : ''}
              </ThemedText>
            </View>
          </View>
        </GlassCard>
      </FadeInView>
    </Pressable>
  );
}

function SavingsSkeleton() {
  return (
    <View>
      <View style={styles.skeletonHero}>
        <View style={styles.skeletonHeroHead}>
          <View style={styles.skeletonText} />
          <View style={styles.skeletonBadge} />
        </View>
        <View style={styles.skeletonRing} />
        <View style={styles.skeletonStats}>
          <View style={styles.skeletonStat} />
          <View style={styles.skeletonStat} />
        </View>
      </View>
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonCard} />
    </View>
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
  heroCard: {
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.xl,
  },
  heroEyebrow: {
    letterSpacing: 1,
    marginBottom: spacing.xxs,
  },
  heroBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.borderStrong,
  },
  goalsList: {
    gap: spacing.md,
  },
  goalCardWrap: {
    borderRadius: radius.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  goalBody: {
    flex: 1,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxs,
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
  skeletonNewGoal: {
    width: 92,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  skeletonHero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  skeletonHeroHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.lg,
  },
  skeletonText: {
    width: 120,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceStrong,
  },
  skeletonBadge: {
    width: 64,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceStrong,
  },
  skeletonRing: {
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: 18,
    borderColor: colors.surfaceStrong,
  },
  skeletonStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xl,
    width: '100%',
  },
  skeletonStat: {
    flex: 1,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
  },
  skeletonCard: {
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
});
