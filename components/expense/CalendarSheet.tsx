import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { addMonths, currentMonthStart, isSameDay, monthGrid, startOfMonth } from '../../utils/date';
import { ThemedText } from '../ui/ThemedText';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MIN_YEAR = 2020;

type CalendarSheetProps = {
  selected: Date;
  onSelect: (date: Date) => void;
};

/**
 * Minimal self-contained month calendar used as the expense date picker. Works
 * identically on iOS and React Native Web with no third-party dependency.
 * Navigation stops at the current month; only dates up to today can be chosen.
 */
export function CalendarSheet({ selected, onSelect }: CalendarSheetProps) {
  const today = new Date();
  const [view, setView] = useState(() => startOfMonth(selected));

  const canGoNext =
    view.getFullYear() < today.getFullYear() ||
    (view.getFullYear() === today.getFullYear() && view.getMonth() < today.getMonth());
  const canGoBack =
    view.getFullYear() > MIN_YEAR ||
    (view.getFullYear() === MIN_YEAR && view.getMonth() > 0);

  const cells = monthGrid(view.getFullYear(), view.getMonth());
  const monthLabel = view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <View>
      <ThemedText variant="subheading" color={colors.text} style={styles.title}>
        Select date
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
          disabled={!canGoNext}
          onPress={() => setView((v) => addMonths(v, 1))}
          hitSlop={8}
          style={[styles.nav, !canGoNext && styles.navDisabled]}
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
          const isSelected = isSameDay(date, selected);
          const isToday = isSameDay(date, today);
          const isDisabled = date.getTime() > today.getTime();

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
        onPress={() => onSelect(today)}
        hitSlop={8}
        style={({ pressed }) => [styles.todayLink, pressed && styles.todayLinkPressed]}
      >
        <ThemedText variant="captionBold" color={colors.accentStrong}>
          Jump to today
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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