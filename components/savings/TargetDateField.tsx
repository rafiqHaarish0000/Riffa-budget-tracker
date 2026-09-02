import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { addMonths, formatDateLong, isSameDay, monthGrid, parseISODate, startOfMonth, toISODate } from '../../utils/date';
import { GlassCard, GlassModal } from '../ui/glass';
import { ThemedText } from '../ui/ThemedText';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MIN_YEAR = 2020;

type TargetDateFieldProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

/**
 * Pressable date row that opens a calendar allowing only today or a future
 * date (for savings goal target dates). Supports clearing the optional value.
 */
export function TargetDateField({ value, onChange }: TargetDateFieldProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(date: Date) {
    onChange(toISODate(date));
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setOpen(false);
  }

  const display = value ? formatDateLong(value) : 'No target date';

  return (
    <View>
      <ThemedText variant="label" color={colors.textSecondary} style={styles.label}>
        Target date (optional)
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Target date"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="calendar-outline" size={iconSizes.md} color={colors.accent} />
        </View>
        <View style={styles.meta}>
          <ThemedText variant="bodyMedium" color={value ? colors.text : colors.textMuted}>
            {display}
          </ThemedText>
          <ThemedText variant="caption" color={colors.textMuted}>
            Choose today or a future date
          </ThemedText>
        </View>
        <Ionicons name="chevron-down" size={iconSizes.sm} color={colors.textMuted} />
      </Pressable>

      <GlassModal visible={open} onClose={() => setOpen(false)} presentationStyle="center">
        <TargetDateSheet
          selected={value ? parseISODate(value) : null}
          onSelect={handleSelect}
          onClear={handleClear}
        />
      </GlassModal>
    </View>
  );
}

function TargetDateSheet({
  selected,
  onSelect,
  onClear,
}: {
  selected: Date | null;
  onSelect: (date: Date) => void;
  onClear: () => void;
}) {
  const today = new Date();
  const [view, setView] = useState(() => (selected ? startOfMonth(selected) : startOfMonth(today)));

  const canGoBack =
    view.getFullYear() > MIN_YEAR || (view.getFullYear() === MIN_YEAR && view.getMonth() > 0);

  const cells = monthGrid(view.getFullYear(), view.getMonth());
  const monthLabel = view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <View>
      <ThemedText variant="subheading" color={colors.text} style={styles.title}>
        Set a target date
      </ThemedText>

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          disabled={!canGoBack}
          onPress={() => setView((v) => addMonths(v, -1))}
          hitSlop={8}
          style={[styles.nav, !canGoBack && styles.navDisabled]}
        >
          <Ionicons name="chevron-back" size={iconSizes.md} color={colors.accent} />
        </Pressable>
        <ThemedText variant="bodyMedium" color={colors.text}>
          {monthLabel}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => setView((v) => addMonths(v, 1))}
          hitSlop={8}
          style={styles.nav}
        >
          <Ionicons name="chevron-forward" size={iconSizes.md} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((day, index) => (
          <ThemedText key={`${day}-${index}`} variant="label" color={colors.textMuted} style={styles.weekCell}>
            {day}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === 0) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }
          const date = new Date(view.getFullYear(), view.getMonth(), day);
          const isSelected = selected ? isSameDay(date, selected) : false;
          const isToday = isSameDay(date, today);
          const isDisabled = date.getTime() < today.getTime();

          return (
            <Pressable
              key={`day-${day}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`${day} ${monthLabel}`}
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}
              disabled={isDisabled}
              onPress={() => onSelect(date)}
              style={[styles.cell, isDisabled && styles.cellDisabled]}
            >
              <View
                style={[
                  styles.day,
                  isSelected && styles.daySelected,
                  !isSelected && isToday && styles.dayToday,
                ]}
              >
                <ThemedText
                  variant="bodyMedium"
                  color={isSelected ? colors.textInverse : colors.text}
                >
                  {day}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onClear}
        hitSlop={8}
        style={({ pressed }) => [styles.todayLink, pressed && styles.todayLinkPressed]}
      >
        <ThemedText variant="captionBold" color={colors.accentStrong}>
          No target date
        </ThemedText>
      </Pressable>
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
  title: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  nav: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: {
    opacity: 0.3,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekCell: {
    flexBasis: `${100 / 7}%`,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    flexBasis: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxs,
  },
  cellDisabled: {
    opacity: 0.35,
  },
  day: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: colors.accent,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  todayLink: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  todayLinkPressed: {
    opacity: 0.6,
  },
});
