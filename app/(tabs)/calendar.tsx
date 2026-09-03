import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ExpenseList } from '../../components/dashboard/ExpenseList';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { GlassCard, GlassSection } from '../../components/ui/glass';
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

  function goToToday() {
    setViewMonth(startOfMonth(todayDate));
    setSelectedDate(todayDate);
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

          return (
            <Pressable
              key={`day-${day}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}${hasExpenses ? ', has expenses' : ''}`}
              accessibilityState={{ selected: isSelected, disabled }}
              disabled={disabled}
              onPress={() => setSelectedDate(date)}
              style={[styles.cell, disabled && styles.cellDisabled]}
            >
              <View
                style={[
                  styles.day,
                  isSelected && styles.daySelected,
                  !isSelected && isToday && styles.dayToday,
                ]}
              >
                <ThemedText variant="bodyMedium" color={isSelected ? colors.textInverse : colors.text}>
                  {day}
                </ThemedText>
                <View style={styles.indicatorSlot}>
                  {hasExpenses ? <View style={[styles.indicator, isSelected && styles.indicatorSelected]} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ThemedScreen
      scroll
      contentContainerStyle={{ paddingBottom: spacing.massive + 92 }}
    >
      <FadeInView delay={0}>
        <View style={styles.header}>
          <ThemedText variant="heading" color={colors.text}>
            Calendar
          </ThemedText>
          <ThemedText variant="caption" color={colors.textMuted}>
            See where your money went each day.
          </ThemedText>
        </View>
      </FadeInView>

      <FadeInView delay={60} style={styles.section}>
        <GlassCard>
          <View style={styles.calHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              disabled={!canGoBack}
              onPress={() => navigateMonth(-1)}
              hitSlop={8}
              style={[styles.nav, !canGoBack && styles.navDisabled]}
            >
              <Ionicons name="chevron-back" size={iconSizes.md} color={colors.accent} />
            </Pressable>
            <ThemedText variant="subheading" color={colors.text}>
              {monthLabel}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              disabled={!canGoNext}
              onPress={() => navigateMonth(1)}
              hitSlop={8}
              style={[styles.nav, !canGoNext && styles.navDisabled]}
            >
              <Ionicons name="chevron-forward" size={iconSizes.md} color={colors.accent} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((day) => (
              <ThemedText key={day} variant="label" color={colors.textMuted} style={styles.weekCell}>
                {day}
              </ThemedText>
            ))}
          </View>

          {renderNumberRow()}

          {!isCurrentMonth ? (
            <Pressable
              accessibilityRole="button"
              onPress={goToToday}
              hitSlop={8}
              style={({ pressed }) => [styles.todayLink, pressed && styles.todayLinkPressed]}
            >
              <ThemedText variant="captionBold" color={colors.accentStrong}>
                Today
              </ThemedText>
            </Pressable>
          ) : null}
        </GlassCard>
      </FadeInView>

      <GlassSection title="Monthly summary">
        <FadeInView delay={120}>
          <GlassCard padding={spacing.lg}>
            {loading ? (
              <ThemedText variant="body" color={colors.textMuted}>
                Loading month…
              </ThemedText>
            ) : error ? (
              <ThemedText variant="body" color={colors.textMuted}>
                Couldn&apos;t load this month.
              </ThemedText>
            ) : (
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <ThemedText variant="caption" color={colors.textMuted}>
                    Total spent
                  </ThemedText>
                  <ThemedText variant="subheading" color={colors.text}>
                    {formatCurrency(monthTotal)}
                  </ThemedText>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
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
      </GlassSection>

      <View style={styles.section}>
        <ThemedText variant="heading" color={colors.text}>
          {formatDateLong(selectedKey)}
        </ThemedText>
        <ThemedText variant="caption" color={colors.textMuted} style={styles.daySubtitle}>
          {selectedExpenses.length === 0
            ? 'Nothing was recorded for this day.'
            : `${selectedExpenses.length} expense${selectedExpenses.length === 1 ? '' : 's'} · ${formatCurrency(selectedTotal)}`}
        </ThemedText>
      </View>

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
        <ScreenState
          kind="empty"
          icon="calendar-outline"
          title="No expenses"
          message="Nothing was recorded for this day."
          compact
        />
      ) : (
        <ExpenseList
          expenses={selectedExpenses}
          onPressExpense={(id) => router.push({ pathname: '/expense/details', params: { id } })}
          paymentsByExpense={paymentsByExpense}
          members={members}
          currentUserId={user?.id ?? null}
        />
      )}
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  calHeader: {
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
  indicatorSlot: {
    position: 'absolute',
    bottom: 4,
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  indicatorSelected: {
    backgroundColor: colors.textInverse,
  },
  todayLink: {
    alignSelf: 'center',
    marginTop: spacing.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  todayLinkPressed: {
    opacity: 0.7,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
  daySubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
});
