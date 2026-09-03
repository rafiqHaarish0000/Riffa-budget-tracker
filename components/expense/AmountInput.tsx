import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { colors, iconSizes, radius, spacing, typography } from '../../constants/theme';
import { GlassCard } from '../ui/glass';
import { ThemedText } from '../ui/ThemedText';

/**
 * Strip anything that isn't a digit or a single decimal separator, and never
 * allow more than two decimal places. Prevents malformed values from ever
 * reaching the database.
 */
export function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) {
    return cleaned.replace(/^0+(?=\d)/, '');
  }
  const integerPart = cleaned.slice(0, firstDot).replace(/^0+(?=\d)/, '');
  const decimalPart = cleaned
    .slice(firstDot + 1)
    .replace(/\./g, '')
    .slice(0, 2);
  return `${integerPart}.${decimalPart}`;
}

/** Parse a sanitized amount string into a fixed-precision number, or null. */
export function parseAmount(value: string): number | null {
  if (value.trim() === '' || value === '.') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

type AmountInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
  label?: string;
};

export function AmountInput({ value, onChangeText, editable = true, label = 'Amount' }: AmountInputProps) {
  return (
    <View>
      <View style={styles.labelRow}>
        <View style={styles.labelIcon}>
          <Ionicons name="cash-outline" size={14} color={colors.accent} />
        </View>
        <ThemedText variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </ThemedText>
      </View>
      <GlassCard padding={spacing.xl} style={styles.card}>
        <View style={styles.row}>
          <View style={styles.currencyCircle}>
            <ThemedText variant="title" color={colors.accentStrong} style={styles.currency}>
              ₹
            </ThemedText>
          </View>
          <TextInput
            value={value}
            onChangeText={(text) => onChangeText(sanitizeAmountInput(text))}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
            inputMode="decimal"
            maxLength={12}
            editable={editable}
            accessibilityRole="text"
            accessibilityLabel="Amount"
            returnKeyType="done"
            style={styles.input}
          />
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  labelIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
  },
  card: {
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  currency: {
    fontSize: 24,
    lineHeight: 32,
  },
  input: {
    flex: 1,
    minHeight: 52,
    padding: 0,
    ...typography.title,
    fontSize: 40,
    lineHeight: 48,
    color: colors.text,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none' } as unknown as Record<string, unknown>)
      : null),
  },
});