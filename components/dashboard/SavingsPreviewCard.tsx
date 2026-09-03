import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import type { SavingsGoal } from '../../types/savings';
import { formatCurrency } from '../../utils/format';
import { GlassButton, GlassCard } from '../ui/glass';
import { ThemedText } from '../ui/ThemedText';

type SavingsPreviewCardProps = {
  goals: SavingsGoal[];
  onViewAll: () => void;
  onCreateGoal?: () => void;
};

const MAX_GOALS = 3;

export function SavingsPreviewCard({ goals, onViewAll, onCreateGoal }: SavingsPreviewCardProps) {
  if (goals.length === 0) {
    return (
      <GlassCard style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Ionicons name="wallet-outline" size={iconSizes.xl} color={colors.accentStrong} />
        </View>
        <ThemedText variant="subheading" color={colors.text}>
          No savings goals yet
        </ThemedText>
        <ThemedText
          variant="caption"
          color={colors.textMuted}
          style={{ textAlign: 'center', marginTop: spacing.xs }}
        >
          Set your first goal to start building your future.
        </ThemedText>
        {onCreateGoal ? (
          <GlassButton title="Create a goal" onPress={onCreateGoal} style={styles.createButton} />
        ) : null}
      </GlassCard>
    );
  }

  return (
    <GlassCard padding={spacing.sm}>
      {goals.slice(0, MAX_GOALS).map((goal, index) => (
        <View key={goal.id}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <GoalRow goal={goal} />
        </View>
      ))}
      <Pressable
        onPress={onViewAll}
        accessibilityRole="button"
        style={({ pressed }) => [styles.viewAll, pressed && styles.pressed]}
      >
        <ThemedText variant="captionBold" color={colors.accent}>
          View savings
        </ThemedText>
        <Ionicons name="chevron-forward" size={iconSizes.sm} color={colors.accent} />
      </Pressable>
    </GlassCard>
  );
}

function GoalRow({ goal }: { goal: SavingsGoal }) {
  const progress =
    goal.target_amount > 0
      ? Math.min(1, Math.max(0, goal.current_amount / goal.target_amount))
      : 0;
  const percent = Math.round(progress * 100);

  return (
    <View style={styles.goal}>
      <View style={styles.goalTop}>
        <ThemedText variant="bodyMedium" color={colors.text} numberOfLines={1} style={styles.name}>
          {goal.name}
        </ThemedText>
        <ThemedText variant="captionBold" color={colors.accentStrong}>
          {percent}%
        </ThemedText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <ThemedText variant="caption" color={colors.textMuted}>
        {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  createButton: {
    marginTop: spacing.lg,
    minWidth: 150,
  },
  goal: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  name: {
    flex: 1,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.7,
  },
});