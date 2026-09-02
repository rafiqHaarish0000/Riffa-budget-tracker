import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import type { ExpenseType } from '../../types/expense';
import { ThemedText } from '../ui/ThemedText';

export type PayerOption = {
  id: string;
  label: string;
};

type PaidBySelectorProps = {
  type: ExpenseType;
  payerId: string;
  userId: string | null;
  /** Real family member (spouse/partner). Only rendered when actually present. */
  partner: PayerOption | null;
  onSelect: (payerId: string) => void;
};

/**
 * Payer picker. Personal expenses are always paid by the authenticated user and
 * can never be reassigned to a spouse. Shared expenses may be paid by the user
 * or — only when a real partner member exists — by that partner. Never invents
 * names or exposes another member's private data.
 */
export function PaidBySelector({
  type,
  payerId,
  userId,
  partner,
  onSelect,
}: PaidBySelectorProps) {
  if (type === 'personal') {
    return (
      <View>
        <PayerRow
          label="You"
          sub="Personal expenses are always paid by you."
          active
          onPress={() => onSelect(userId ?? '')}
        />
      </View>
    );
  }

  const options: PayerOption[] = [
    { id: userId ?? 'you', label: 'You' },
    ...(partner ? [{ id: partner.id, label: partner.label }] : []),
  ];

  return (
    <View accessibilityRole="radiogroup">
      {options.map((option, index) => (
        <PayerRow
          key={option.id}
          label={option.label}
          sub={index === 0 ? 'Paid by you' : undefined}
          active={payerId === option.id}
          onPress={() => onSelect(option.id)}
        />
      ))}
    </View>
  );
}

type PayerRowProps = {
  label: string;
  sub?: string;
  active: boolean;
  onPress: () => void;
};

function PayerRow({ label, sub, active, onPress }: PayerRowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`Paid by ${label}`}
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        active && styles.rowActive,
        pressed && !active && styles.rowPressed,
      ]}
    >
      <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
        <Ionicons name="person-outline" size={iconSizes.md} color={colors.accent} />
      </View>
      <View style={styles.meta}>
        <ThemedText variant="bodyMedium" color={colors.text}>
          {label}
        </ThemedText>
        {sub ? (
          <ThemedText variant="caption" color={colors.textMuted}>
            {sub}
          </ThemedText>
        ) : null}
      </View>
      <Ionicons
        name={active ? 'checkmark-circle' : 'ellipse-outline'}
        size={iconSizes.md}
        color={active ? colors.accentStrong : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  rowActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.white,
  },
  meta: {
    flex: 1,
  },
});