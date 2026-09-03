import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ExpenseList } from '../../components/dashboard/ExpenseList';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { GlassCard } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { ScreenState, ScreenStateSkeleton } from '../../components/ui/ScreenState';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses, type ExpenseDateRange } from '../../hooks/useExpenses';
import { useFamily } from '../../hooks/useFamily';
import { addMonths, formatDateLong, isSameDay, monthGrid, startOfMonth, toISODate } from '../../utils/date';
import { formatCurrency, sumExpenses } from '../../utils/format';
import type { Expense } from '../../types/expense';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(n: number): string {
  return `${n}`.padStart(2, '0');
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthStartKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function lastDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const defaultMonth = startOfMonth(new Date());
  const todayDate = new Date();
  const [viewMonth, setViewMonth] = useState<Date>(defaultMonth);
  const [selectedDate, setSelectedDate] = useState<Date>(todayDate);

  const dateRange = useMemo<ExpenseDateRange>(
    () => ({
      start: monthStartKey(viewMonth),
      end: toISODate(lastDayOfMonth(viewMonth)),
    }),
    [viewMonth],
  );

  const { expenses, paymentsByExpense, loading, error, refetch } = useExpenses(
    user?.family_id ?? null,
    user?.id ?? null,
    dateRange,
  );

  const { members } = useFamily(user);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  let selectedDateActive = selectedDate;
  if (selectedDate.getMonth() !== viewMonth.getMonth() || selectedDate.getFullYear() !== viewMonth.getFullYear()) {
    selectedDateActive = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  }

  const monthExpenses = useMemo(
    () =>
      expenses.filter((expense) => (expense.date ?? '').slice(0, 7) === `${viewMonth.getFullYear()}-${pad(viewMonth.getMonth() + 1)}`),
    [expenses, viewMonth],
  );

  const expensesByDay = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const expense of monthExpenses) {
      const key = (expense.date ?? '').slice(0, 10);
      const list = map.get(key);
      if (list) {
        list.push(expense);
      } else {
        map.set(key, [expense]);
      }
    }
    return map;
  }, [monthExpenses]);

  const selectedKey = dayKey(selectedDateActive);
  const selectedExpenses = useMemo(
    () => [...(expensesByDay.get(selectedKey) ?? [])].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
    [expensesByDay, selectedKey],
  );
  const selectedTotal = sumExpenses(selectedExpenses);

  const monthTotal = sumExpenses(monthExpenses);
  const monthCount = monthExpenses.length;
  const canGoNext = viewMonth < startOfMonth(todayDate);
  const canGoBack = viewMonth.getFullYear() > 2020 || (viewMonth.getFullYear() === 2020 && viewMonth.getMonth() > 0);
  const isCurrentMonth = isSameDay(viewMonth, defaultMonth);
  const monthLabel = viewMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const cells = useMemo(() => monthGrid(viewMonth.getFullYear(), viewMonth.getMonth()), [viewMonth]);

  function navigateMonth(delta: number) {
    setViewMonth((month) => {
      const next = addMonths(month, delta);
      const today = new Date();
      if (next > startOfMonth(today)) {
        return month;
      }
      return next;
    });
  }

  function renderNumberRow() {
    return (
      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === 0) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }
          const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
          const isSelected = isSameDay(date, selectedDateActive);
          const isToday = isSameDay(date, todayDate) && isCurrentMonth;
          const hasExpenses = expensesByDay.has(dayKey(date));
          const disabled = date.getTime() > todayDate.getTime();
          const isWeekend = index % 7 >= 5;

          return (
            <Pressable
              key={`day-${day}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}${hasExpenses ? ', has expenses' : ''}`}
              accessibilityState={{ selected: isSelected, disabled }}
              disabled={disabled}
              onPress={() => setSelectedDate(date)}
              style={({ pressed }) => [
                styles.cell,
                disabled && styles.cellDisabled,
                pressed && !disabled && styles.cellPressed,
              ]}
            >
              <View
                style={[
                  styles.day,
                  isSelected && styles.daySelected,
                  !isSelected && isToday && styles.dayToday,
                  !isSelected && !isToday && hasExpenses && styles.dayWithExpenses,
                ]}
              >
                <ThemedText
                  variant="bodyMedium"
                  color={
                    isSelected
                      ? colors.textInverse
                      : isToday
                        ? colors.accent
                        : isWeekend
                          ? colors.accent
                          : colors.text
                  }
                >
                  {day}
                </ThemedText>
              </View>
              {hasExpenses && (
                <View style={[styles.indicatorContainer, isSelected && styles.indicatorContainerSelected]}>
                  <View style={[styles.indicatorDot, isSelected && styles.indicatorDotSelected]} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ThemedScreen
      scroll
      contentContainerStyle={styles.screenContent}
    >
      <FadeInView delay={0}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ThemedText variant="heading" color={colors.text}>
              Calendar
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted}>
              See where your money went each day.
            </ThemedText>
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={60} style={styles.calendarSection}>
        <GlassCard padding={0} style={styles.calendarCard}>
          <View style={styles.calHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              disabled={!canGoBack}
              onPress={() => navigateMonth(-1)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.navButton,
                !canGoBack && styles.navDisabled,
                pressed && styles.navPressed,
              ]}
            >
              <Ionicons name="chevron-back" size={iconSizes.md} color={colors.accent} />
            </Pressable>
            <View style={styles.monthLabelContainer}>
              <ThemedText variant="subheading" color={colors.text}>
                {monthLabel}
              </ThemedText>
              {monthCount > 0 && (
                <View style={styles.monthBadge}>
                  <ThemedText variant="label" color={colors.accentStrong}>
                    {monthCount}
                  </ThemedText>
                </View>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              disabled={!canGoNext}
              onPress={() => navigateMonth(1)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.navButton,
                !canGoNext && styles.navDisabled,
                pressed && styles.navPressed,
              ]}
            >
              <Ionicons name="chevron-forward" size={iconSizes.md} color={colors.accent} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((day, index) => (
              <ThemedText
                key={day}
                variant="label"
                color={index >= 5 ? colors.accent : colors.textMuted}
                style={styles.weekCell}
              >
                {day}
              </ThemedText>
            ))}
          </View>

          <View style={styles.gridContainer}>
            {renderNumberRow()}
          </View>


        </GlassCard>
      </FadeInView>

      <FadeInView delay={120} style={styles.summarySection}>
        <View style={styles.summaryHeader}>
          <ThemedText variant="subheading" color={colors.text}>
            Monthly summary
          </ThemedText>
        </View>
        <GlassCard padding={spacing.lg} style={styles.summaryCard}>
          {loading ? (
            <ThemedText variant="body" color={colors.textMuted}>
              Loading month…
            </ThemedText>
          ) : error ? (
            <ThemedText variant="body" color={colors.textMuted}>
              Couldn&apos;t load this month.
            </ThemedText>
          ) : (
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="wallet-outline" size={20} color={colors.accent} />
                </View>
                <ThemedText variant="caption" color={colors.textMuted}>
                  Total spent
                </ThemedText>
                <ThemedText variant="subheading" color={colors.text}>
                  {formatCurrency(monthTotal)}
                </ThemedText>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="receipt-outline" size={20} color={colors.accent} />
                </View>
                <ThemedText variant="caption" color={colors.textMuted}>
                  Expenses
                </ThemedText>
                <ThemedText variant="subheading" color={colors.text}>
                  {monthCount}
                </ThemedText>
              </View>
            </View>
          )}
        </GlassCard>
      </FadeInView>

      <FadeInView delay={180} style={styles.selectedDaySection}>
        <View style={styles.selectedDayHeader}>
          <View style={styles.selectedDayTitleRow}>
            <View style={styles.selectedDayDot} />
            <ThemedText variant="heading" color={colors.text}>
              {formatDateLong(selectedKey)}
            </ThemedText>
          </View>
          <ThemedText variant="caption" color={colors.textMuted}>
            {selectedExpenses.length === 0
              ? 'Nothing was recorded for this day.'
              : `${selectedExpenses.length} expense${selectedExpenses.length === 1 ? '' : 's'} · ${formatCurrency(selectedTotal)}`}
          </ThemedText>
        </View>
      </FadeInView>

      <View style={styles.expensesSection}>
        {loading ? (
          <ScreenStateSkeleton rows={3} />
        ) : error ? (
          <ScreenState
            kind="error"
            icon="alert-circle-outline"
            title="Something went wrong"
            message="We couldn&apos;t load your expenses."
            actionLabel="Retry"
            actionVariant="secondary"
            onAction={() => refetch()}
          />
        ) : selectedExpenses.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={iconSizes.xl} color={colors.accentStrong} />
            </View>
            <ThemedText variant="subheading" color={colors.text}>
              No expenses
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted} style={styles.emptyText}>
              Nothing was recorded for this day.
            </ThemedText>
          </GlassCard>
        ) : (
          <ExpenseList
            expenses={selectedExpenses}
            onPressExpense={(id) => router.push({ pathname: '/expense/details', params: { id } })}
            paymentsByExpense={paymentsByExpense}
            members={members}
            currentUserId={user?.id ?? null}
          />
        )}
      </View>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.massive + 92,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  calendarSection: {
    marginBottom: spacing.xl,
  },
  calendarCard: {
    paddingVertical: spacing.lg,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  navPressed: {
    backgroundColor: colors.surfaceStrong,
    transform: [{ scale: 0.95 }],
  },
  navDisabled: {
    opacity: 0.3,
  },
  monthLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  weekCell: {
    flexBasis: `${100 / 7}%`,
    textAlign: 'center',
  },
  gridContainer: {
    paddingHorizontal: spacing.sm,
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
    opacity: 0.3,
  },
  cellPressed: {
    transform: [{ scale: 0.92 }],
  },
  day: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: colors.accent,
    ...{
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    },
  },
  dayToday: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  dayWithExpenses: {
    backgroundColor: 'rgba(85, 214, 177, 0.08)',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorContainerSelected: {
    bottom: 3,
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  indicatorDotSelected: {
    backgroundColor: colors.textInverse,
  },
  summarySection: {
    marginBottom: spacing.xl,
  },
  summaryHeader: {
    marginBottom: spacing.md,
  },
  summaryCard: {
    paddingVertical: spacing.xl,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    gap: spacing.sm,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: spacing.xl,
    backgroundColor: colors.border,
  },
  selectedDaySection: {
    marginBottom: spacing.md,
  },
  selectedDayHeader: {
    gap: spacing.xs,
  },
  selectedDayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedDayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  expensesSection: {
    marginBottom: spacing.xl,
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
  emptyText: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
