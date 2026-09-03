import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import type { ExpenseAllocation, ExpenseType } from '../../types/expense';
import type { FamilyMember } from '../../types/family';
import { sanitizeAmountInput } from '../expense/AmountInput';
import { GlassCard } from '../ui/glass';
import { ThemedText } from '../ui/ThemedText';

export type SplitValidation = {
  /** Sum of all entered per-payer amounts. */
  total: number;
  /** expenseTotal - total (can be negative when over). */
  remaining: number;
  /** True when total equals the expense total exactly. */
  valid: boolean;
  /** True when total exceeds the expense total. */
  over: boolean;
};

export type PaymentSplitState = {
  allocations: ExpenseAllocation[];
  validation: SplitValidation;
};

type PaymentSplitItem = {
  user_id: string;
  label: string;
  /** Raw input string as the user typed it ('' until edited). */
  value: string;
  /** Whether the user edited it (used to preserve the smart default across refreshes). */
  edited: boolean;
};

type PaymentSplitSelectorProps = {
  type: ExpenseType;
  expenseTotal: number;
  /** The authenticated user's id (drives "You" emphasis + default owner). */
  currentUserId: string | null;
  /** Real family members from Supabase (never hardcoded to two people). */
  members: FamilyMember[];
  /**
   * Existing allocations (create: smart default or edit: current split).
   * When absent/empty on a shared expense, defaults the whole amount to the current user.
   */
  initial?: ExpenseAllocation[];
  onChange?: (state: PaymentSplitState) => void;
  editable?: boolean;
};

/**
 * Per-payer amount inputs for a (shared) expense. Shows one row per family
 * member with an individual amount field, plus a Total paid / Remaining
 * summary. Validation (sum == expense total) is surfaced here and enforced
 * server-side by the atomic RPCs.
 */
export function PaymentSplitSelector({
  type,
  expenseTotal,
  currentUserId,
  members,
  initial = [],
  onChange,
  editable = true,
}: PaymentSplitSelectorProps) {
  const [items, setItems] = useState<PaymentSplitItem[]>([]);

  // (Re)seed rows from members whenever the selected type, the family members,
  // or the provided allocations change (e.g. an expense being edited finishes
  // loading). For a newly-created shared expense with no allocations yet, the
  // smart default (whole amount → current user) is reseeded as the amount is
  // typed — but only while the user has NOT edited any row, so we never clobber
  // their manual split as they type the total afterwards.
  useEffect(() => {
    const payers = members.filter((m) => m.user_id != null);
    const labelFor = (member: FamilyMember): string =>
      member.user_id === currentUserId ? 'You' : (member.user?.name?.trim() ?? 'Member');

    setItems((prev) => {
      const pristine = !prev.some((p) => p.edited);
      const next: PaymentSplitItem[] = [];
      for (const member of payers) {
        const prevItem = prev.find((p) => p.user_id === member.user_id);
        const allocation = initial.find((a) => a.user_id === member.user_id);
        const isYou = member.user_id === currentUserId;

        // Preserve the user's edit if they've already typed for this member and
        // no new allocation was supplied for them.
        if (prevItem?.edited && !allocation) {
          next.push(prevItem);
          continue;
        }

        if (!pristine && !allocation) {
          // Re-run smart default (whole amount → current user) only while the
          // user hasn't edited anything.
          const value = isYou && expenseTotal > 0 ? String(expenseTotal) : (prevItem?.value ?? '');
          next.push({
            user_id: member.user_id,
            label: labelFor(member),
            value,
            edited: false,
          });
          continue;
        }

        const value = allocation
          ? String(allocation.amount)
          : isYou && expenseTotal > 0
            ? String(expenseTotal)
            : (prevItem?.value ?? '');
        next.push({
          user_id: member.user_id,
          label: labelFor(member),
          value,
          edited: allocation != null,
        });
      }
      return next;
    });
    // Reads of `initial`/`expenseTotal`/`members` intentionally wired through
    // the effect; reseeds when the expense/allocations/amount change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, currentUserId, members, initialKeyOf(initial), expenseTotal]);

  const validation = useMemo<SplitValidation>(() => {
    let total = 0;
    for (const item of items) {
      const amount = parseSplit(item.value);
      if (amount) {
        total += amount;
      }
    }
    const remaining = expenseTotal - total;
    return {
      total,
      remaining,
      valid: Math.round(remaining * 100) === 0,
      over: remaining < 0,
    };
  }, [items, expenseTotal]);

  const allocations = useMemo<ExpenseAllocation[]>(() => {
    const result: ExpenseAllocation[] = [];
    for (const item of items) {
      const amount = parseSplit(item.value);
      if (amount && amount > 0) {
        result.push({ user_id: item.user_id, amount });
      }
    }
    return result;
  }, [items]);

  useEffect(() => {
    onChange?.({ allocations, validation });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations, validation, onChange]);

  function updateValue(userId: string, raw: string) {
    const value = sanitizeAmountInput(raw);
    setItems((prev) =>
      prev.map((item) =>
        item.user_id === userId ? { ...item, value, edited: true } : item,
      ),
    );
  }

  return (
    <GlassCard padding={spacing.md}>
      {items.map((item) => {
        const isYou = item.user_id === currentUserId;
        return (
          <View key={item.user_id} style={styles.row}>
            <View style={styles.member}>
              <View
                style={[styles.avatar, isYou && styles.avatarYou]}
                accessibilityRole="image"
                accessibilityLabel={item.label}
              >
                <ThemedText variant="label" color={isYou ? colors.textInverse : colors.textSecondary}>
                  {item.label.slice(0, 1).toUpperCase() || '?'}
                </ThemedText>
              </View>
              <ThemedText variant="bodyMedium" color={colors.text} numberOfLines={1}>
                {item.label}
              </ThemedText>
            </View>
            <View style={styles.amount}>
              <ThemedText variant="body" color={colors.textMuted} style={styles.rupee}>
                ₹
              </ThemedText>
              <TextInput
                value={item.value}
                onChangeText={(text) => updateValue(item.user_id, text)}
                placeholder={item.edited ? '0' : '—'}
                placeholderTextColor={colors.textMuted}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                inputMode="decimal"
                maxLength={12}
                editable={editable}
                accessibilityRole="text"
                accessibilityLabel={`Amount paid by ${item.label}`}
                returnKeyType="done"
                style={styles.input}
              />
            </View>
          </View>
        );
      })}

      <View style={styles.divider} />

      <View style={styles.summaryRow}>
        <ThemedText variant="caption" color={colors.textMuted}>
          Total paid
        </ThemedText>
        <ThemedText variant="bodyMedium" color={colors.text}>
          {formatSplit(validation.total)}
        </ThemedText>
      </View>
      <View style={styles.summaryRow}>
        <ThemedText variant="caption" color={colors.textMuted}>
          Remaining
        </ThemedText>
        <ThemedText
          variant="bodyMedium"
          color={validation.valid ? colors.accentStrong : colors.danger}
        >
          {formatSplit(validation.remaining)}
        </ThemedText>
      </View>

      {!editable ? null : validation.over ? (
        <ThemedText variant="caption" color={colors.danger} style={styles.validation}>
          Payment split exceeds the expense by {formatShort(validation.remaining * -1)}.
        </ThemedText>
      ) : !validation.valid ? (
        <ThemedText variant="caption" color={colors.danger} style={styles.validation}>
          Payment split is {formatShort(validation.remaining)} short.
        </ThemedText>
      ) : (
        <ThemedText variant="caption" color={colors.accentStrong} style={styles.validation}>
          Payment split matches the expense total.
        </ThemedText>
      )}
    </GlassCard>
  );
}

function initialKeyOf(initial: ExpenseAllocation[]): string {
  return initial
    .map((a) => `${a.user_id}:${a.amount}`)
    .sort()
    .join('|');
}

function parseSplit(value: string): number | null {
  if (value.trim() === '' || value === '.') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

function formatSplit(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatShort(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  member: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: spacing.xxxl,
    height: spacing.xxxl,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarYou: {
    backgroundColor: colors.accent,
  },
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rupee: {
    marginRight: spacing.xs,
  },
  input: {
    minWidth: 72,
    minHeight: 44,
    padding: 0,
    ...typography.body,
    fontSize: 24,
    lineHeight: 32,
    color: colors.text,
    textAlign: 'right',
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none' } as unknown as Record<string, unknown>)
      : null),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  validation: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});