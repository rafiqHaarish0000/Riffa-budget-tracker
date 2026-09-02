import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { formatDateLabel, formatDateLong, parseISODate, toISODate } from '../../utils/date';
import { GlassCard, GlassModal } from '../ui/glass';
import { ThemedText } from '../ui/ThemedText';
import { CalendarSheet } from './CalendarSheet';

type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Pressable date row that opens a small calendar sheet. Defaults to today but
 * allows recording any previous date.
 */
export function DateField({ value, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(date: Date) {
    onChange(toISODate(date));
    setOpen(false);
  }

  return (
    <View>
      <ThemedText variant="label" color={colors.textSecondary} style={styles.label}>
        Date
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Date"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="calendar-outline" size={iconSizes.md} color={colors.accent} />
        </View>
        <View style={styles.meta}>
          <ThemedText variant="bodyMedium" color={colors.text}>
            {formatDateLabel(value)}
          </ThemedText>
          <ThemedText variant="caption" color={colors.textMuted}>
            {formatDateLong(value)}
          </ThemedText>
        </View>
        <Ionicons name="chevron-down" size={iconSizes.sm} color={colors.textMuted} />
      </Pressable>

      <GlassModal visible={open} onClose={() => setOpen(false)} presentationStyle="center">
        <CalendarSheet selected={parseISODate(value)} onSelect={handleSelect} />
      </GlassModal>
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
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
  },
});