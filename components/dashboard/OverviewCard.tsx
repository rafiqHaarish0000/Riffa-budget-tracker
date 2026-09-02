import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';
import { GlassCard } from '../ui/glass';
import { ThemedText } from '../ui/ThemedText';

type OverviewCardProps = {
  income: number | null;
  expenses: number;
  savings: number;
  remaining: number | null;
};

export function OverviewCard({ income, expenses, savings, remaining }: OverviewCardProps) {
  const tiles = [
    {
      label: 'Income',
      value: income,
      color: colors.text,
    },
    { label: 'Expenses', value: expenses, color: colors.text },
    {
      label: 'Savings',
      value: savings,
      color: colors.accentStrong,
    },
    {
      label: 'Remaining',
      value: remaining,
      color: remaining !== null && remaining < 0 ? colors.danger : colors.text,
    },
  ];

  return (
    <GlassCard>
      <View style={styles.grid}>
        <View style={styles.row}>
          <Tile tile={tiles[0]} />
          <Tile tile={tiles[1]} />
        </View>
        <View style={styles.row}>
          <Tile tile={tiles[2]} />
          <Tile tile={tiles[3]} />
        </View>
      </View>
    </GlassCard>
  );
}

type TileProps = {
  tile: { label: string; value: number | null; color: string };
};

function Tile({ tile }: TileProps) {
  return (
    <View style={styles.tile}>
      <ThemedText variant="captionBold" color={colors.textMuted}>
        {tile.label}
      </ThemedText>
      <ThemedText variant="bodyMedium" color={tile.color}>
        {tile.value === null ? '—' : formatCurrency(tile.value)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  tile: {
    flex: 1,
    gap: spacing.xxs,
  },
});