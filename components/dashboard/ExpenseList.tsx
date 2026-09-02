import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import type { Expense } from '../../types/expense';
import { formatCurrency } from '../../utils/format';
import { GlassCard } from '../ui/glass';
import { ThemedText } from '../ui/ThemedText';
import { CategoryIcon } from './CategoryIcon';

type ExpenseListProps = {
  expenses: Expense[];
  onPressExpense: (id: string) => void;
};

export function ExpenseList({ expenses, onPressExpense }: ExpenseListProps) {
  if (expenses.length === 0) {
    return <EmptyExpenses />;
  }

  return (
    <GlassCard padding={spacing.sm}>
      {expenses.map((expense, index) => (
        <View key={expense.id}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <ExpenseRow expense={expense} onPress={() => onPressExpense(expense.id)} />
        </View>
      ))}
    </GlassCard>
  );
}

function ExpenseRow({ expense, onPress }: { expense: Expense; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${expense.category}, ${formatCurrency(expense.amount)}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <CategoryIcon category={expense.category} />
      <View style={styles.rowMeta}>
        <ThemedText variant="bodyMedium" color={colors.text} numberOfLines={1}>
          {expense.category}
        </ThemedText>
        <ThemedText variant="caption" color={colors.textMuted}>
          {formatExpenseTime(expense)}
        </ThemedText>
      </View>
      <ThemedText variant="bodyMedium" color={colors.text}>
        {formatCurrency(expense.amount)}
      </ThemedText>
    </Pressable>
  );
}

function EmptyExpenses() {
  return (
    <GlassCard style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name="receipt-outline" size={iconSizes.xl} color={colors.accentStrong} />
      </View>
      <ThemedText variant="subheading" color={colors.text}>
        No expenses yet
      </ThemedText>
      <ThemedText
        variant="caption"
        color={colors.textMuted}
        style={{ marginTop: spacing.xs, textAlign: 'center' }}
      >
        Add your first expense to start tracking.
      </ThemedText>
    </GlassCard>
  );
}

function formatExpenseTime(expense: Expense): string {
  const raw = expense.created_at || expense.date;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowMeta: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
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
});