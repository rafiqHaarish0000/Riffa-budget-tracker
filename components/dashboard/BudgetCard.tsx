import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';
import { GlassCard } from '../ui/glass';
import { ThemedText } from '../ui/ThemedText';

type BudgetCardProps = {
  budget: number;
  spent: number;
};

export function BudgetCard({ budget, spent }: BudgetCardProps) {
  const remaining = budget - spent;
  const ratio = budget > 0 ? spent / budget : 0;
  const progress = Math.min(1, Math.max(0, ratio));
  const accent =
    ratio > 1 ? colors.danger : ratio > 0.8 ? colors.warning : colors.accent;

  return (
    <GlassCard>
      <View style={styles.topRow}>
        <ThemedText variant="captionBold" color={colors.textSecondary}>
          Today's budget
        </ThemedText>
        <ThemedText variant="heading" color={colors.text}>
          {formatCurrency(budget)}
        </ThemedText>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
      </View>

      <View style={styles.bottomRow}>
        <View>
          <ThemedText variant="caption" color={colors.textMuted}>
            Spent
          </ThemedText>
          <ThemedText variant="subheading" color={colors.text}>
            {formatCurrency(spent)}
          </ThemedText>
        </View>
        <View style={styles.remaining}>
          <ThemedText variant="caption" color={colors.textMuted}>
            Remaining
          </ThemedText>
          <ThemedText variant="subheading" color={remaining < 0 ? colors.danger : colors.text}>
            {formatCurrency(Math.max(0, remaining))}
          </ThemedText>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  remaining: {
    alignItems: 'flex-end',
  },
});