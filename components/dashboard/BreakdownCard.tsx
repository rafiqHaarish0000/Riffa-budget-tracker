import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';
import { GlassCard } from '../ui/glass';
import { ThemedText } from '../ui/ThemedText';

type BreakdownCardProps = {
  personal: number;
  shared: number;
};

export function BreakdownCard({ personal, shared }: BreakdownCardProps) {
  const total = personal + shared;

  return (
    <GlassCard>
      <View style={styles.row}>
        <ThemedText variant="bodyMedium" color={colors.text}>
          Your personal
        </ThemedText>
        <ThemedText variant="body" color={colors.text}>
          {formatCurrency(personal)}
        </ThemedText>
      </View>
      <View style={styles.row}>
        <ThemedText variant="bodyMedium" color={colors.text}>
          Shared
        </ThemedText>
        <ThemedText variant="body" color={colors.text}>
          {formatCurrency(shared)}
        </ThemedText>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <ThemedText variant="subheading" color={colors.text}>
          Total
        </ThemedText>
        <ThemedText variant="subheading" color={colors.text}>
          {formatCurrency(total)}
        </ThemedText>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});