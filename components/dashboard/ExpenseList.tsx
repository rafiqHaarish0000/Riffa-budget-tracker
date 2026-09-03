import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import type { Expense, ExpensePayment } from '../../types/expense';
import { formatCurrency } from '../../utils/format';
import { GlassButton, GlassCard } from '../ui/glass';
import { ThemedText } from '../ui/ThemedText';
import { CategoryIcon } from './CategoryIcon';
import type { FamilyMember } from '../../types/family';

type ExpenseListProps = {
  expenses: Expense[];
  onPressExpense: (id: string) => void;
  onAddExpense?: () => void;
  /** Payment allocations grouped by expense_id (from useExpenses), if available. */
  paymentsByExpense?: Record<string, ExpensePayment[]>;
  /** Family members, used to label the secondary "Paid by" line. */
  members?: FamilyMember[];
  /** The authenticated user's id, to label "You" in the payer line. */
  currentUserId?: string | null;
};

export function ExpenseList({
  expenses,
  onPressExpense,
  onAddExpense,
  paymentsByExpense,
  members = [],
  currentUserId = null,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return <EmptyExpenses onAddExpense={onAddExpense} />;
  }

  return (
    <GlassCard padding={spacing.sm}>
      {expenses.map((expense, index) => (
        <View key={expense.id}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <ExpenseRow
            expense={expense}
            onPress={() => onPressExpense(expense.id)}
            payers={paymentsByExpense?.[expense.id]}
            members={members}
            currentUserId={currentUserId}
          />
        </View>
      ))}
    </GlassCard>
  );
}

type ExpenseRowProps = {
  expense: Expense;
  onPress: () => void;
  payers?: ExpensePayment[];
  members?: FamilyMember[];
  currentUserId?: string | null;
};

function ExpenseRow({ expense, onPress, payers, members = [], currentUserId = null }: ExpenseRowProps) {
  const payerLabel = payerSummary(expense, payers, members, currentUserId);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${expense.category}, ${formatCurrency(expense.amount)}${payerLabel ? `, ${payerLabel}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <CategoryIcon category={expense.category} />
      <View style={styles.rowMeta}>
        <ThemedText variant="bodyMedium" color={colors.text} numberOfLines={1}>
          {expense.category}
        </ThemedText>
        <ThemedText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {payerLabel ? `${payerLabel} · ${formatExpenseTime(expense)}` : formatExpenseTime(expense)}
        </ThemedText>
      </View>
      <ThemedText variant="bodyMedium" color={colors.text}>
        {formatCurrency(expense.amount)}
      </ThemedText>
    </Pressable>
  );
}

function payerSummary(
  expense: Expense,
  payers: ExpensePayment[] | undefined,
  members: FamilyMember[],
  currentUserId: string | null,
): string {
  if (expense.type === 'personal') {
    return '';
  }
  const rows = payers && payers.length > 0 ? payers : [];
  if (rows.length === 0) {
    // Legacy: single payer from paid_by.
    const member = members.find((m) => m.user_id === expense.paid_by);
    const label = expense.paid_by === currentUserId ? 'You' : (member?.user?.name?.trim() ?? 'Member');
    return `Paid by ${label}`;
  }
  const names = rows.map((p) => {
    if (p.user_id === currentUserId) {
      return 'You';
    }
    const member = members.find((m) => m.user_id === p.user_id);
    return member?.user?.name?.trim() ?? 'Member';
  });
  if (names.length === 1) {
    return `Paid by ${names[0]}`;
  }
  return `Paid by ${names.join(' + ')}`;
}

function EmptyExpenses({ onAddExpense }: { onAddExpense?: () => void }) {
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
      {onAddExpense ? (
        <GlassButton
          title="Add expense"
          onPress={onAddExpense}
          style={styles.addButton}
        />
      ) : null}
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
    opacity: 0.7,
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
  addButton: {
    marginTop: spacing.lg,
    minWidth: 140,
  },
});