import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
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
};

export function AmountInput({ value, onChangeText, editable = true }: AmountInputProps) {
  return (
    <View>
      <ThemedText variant="label" color={colors.textSecondary} style={styles.label}>
        Amount
      </ThemedText>
      <GlassCard padding={spacing.lg}>
        <View style={styles.row}>
          <ThemedText variant="title" color={colors.text} style={styles.currency}>
            ₹
          </ThemedText>
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
  label: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currency: {
    fontSize: 40,
    lineHeight: 48,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 52,
    padding: 0,
    ...typography.title,
    fontSize: 44,
    lineHeight: 52,
    color: colors.text,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none' } as unknown as Record<string, unknown>)
      : null),
  },
});