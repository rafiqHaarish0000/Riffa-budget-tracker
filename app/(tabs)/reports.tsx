import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CategoryIcon } from '../../components/dashboard/CategoryIcon';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { GlassButton, GlassCard, GlassChip, GlassSection } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses, type ExpenseDateRange } from '../../hooks/useExpenses';
import { formatDateLabel, toISODate } from '../../utils/date';
import { formatCurrency } from '../../utils/format';
import type { Expense, ExpenseCategory } from '../../types/expense';

type Period = 'month' | 'lastMonth' | 'threeMonths' | 'year';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'threeMonths', label: 'Last 3 months' },
  { key: 'year', label: 'This year' },
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Groceries: colors.accentStrong,
  Dining: colors.danger,
  Transport: colors.info,
  Utilities: colors.warning,
  Housing: colors.accent,
  Health: colors.danger,
  Entertainment: colors.info,
  Shopping: colors.accentStrong,
  Travel: colors.info,
  Education: colors.accent,
  Personal: colors.textSecondary,
  Other: colors.textMuted,
};

function pad(n: number): string {
  return `${n}`.padStart(2, '0');
}

function monthStartKey(year: number, monthIndex: number): string {
  return `${year}-${pad(monthIndex + 1)}-01`;
}

function lastDayKey(year: number, monthIndex: number): string {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return `${year}-${pad(monthIndex + 1)}-${pad(last)}`;
}

function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function periodRange(period: Period): ExpenseDateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = dayKeyOf(now);

  switch (period) {
    case 'month':
      return { start: monthStartKey(year, month), end: today };
    case 'lastMonth': {
      const prevYear = month === 0 ? year - 1 : year;
      const prevMonth = month === 0 ? 11 : month - 1;
      return { start: monthStartKey(prevYear, prevMonth), end: lastDayKey(prevYear, prevMonth) };
    }
    case 'threeMonths': {
      const twoAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { start: monthStartKey(twoAgo.getFullYear(), twoAgo.getMonth()), end: today };
    }
    case 'year':
    default:
      return { start: `${year}-01-01`, end: today };
  }
}

function sumExpenses(items: Expense[]): number {
  return items.reduce((acc, item) => acc + (item.amount ?? 0), 0);
}

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('month');

  const dateRange = useMemo(() => periodRange(period), [period]);

  const { expenses, loading, error, refetch } = useExpenses(
    user?.family_id ?? null,
    user?.id ?? null,
    dateRange,
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const periodExpenses = useMemo(
    () =>
      [...expenses].sort((a, b) =>
        (b.date ?? '').localeCompare(a.date ?? '') || (b.created_at ?? '').localeCompare(a.created_at ?? ''),
      ),
    [expenses],
  );

  const total = useMemo(() => sumExpenses(periodExpenses), [periodExpenses]);
  const count = periodExpenses.length;
  const average = count > 0 ? total / count : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const expense of periodExpenses) {
      const category = (expense.category as ExpenseCategory) || 'Other';
      const entry = map.get(category) ?? { total: 0, count: 0 };
      entry.total += expense.amount ?? 0;
      entry.count += 1;
      map.set(category, entry);
    }
    return [...map.entries()]
      .map(([key, value]) => ({ category: key as ExpenseCategory, ...value }))
      .sort((a, b) => b.total - a.total);
  }, [periodExpenses]);

  const categoryBreakdown = useMemo(
    () =>
      byCategory.map((item) => ({
        ...item,
        percent: total > 0 ? (item.total / total) * 100 : 0,
      })),
    [byCategory, total],
  );

  const myPersonalTotal = useMemo(
    () =>
      sumExpenses(
        periodExpenses.filter((e) => e.type === 'personal' && e.user_id === user?.id),
      ),
    [periodExpenses, user?.id],
  );
  const sharedTotal = useMemo(
    () => sumExpenses(periodExpenses.filter((e) => e.type === 'shared')),
    [periodExpenses],
  );

  const trend = useMemo(() => {
    if (period === 'year') {
      const buckets = new Map<string, number>();
      for (const expense of periodExpenses) {
        const key = (expense.date ?? '').slice(0, 7);
        buckets.set(key, (buckets.get(key) ?? 0) + (expense.amount ?? 0));
      }
      return [...buckets.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => ({
          label: new Date(`${key}-01`).toLocaleDateString('en-IN', { month: 'short' }),
          value,
        }));
    }

    const buckets = new Map<string, number>();
    for (const expense of periodExpenses) {
      const key = (expense.date ?? '').slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + (expense.amount ?? 0));
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({
        label: new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric' }),
        value,
      }));
  }, [periodExpenses, period]);

  const trendMax = useMemo(() => Math.max(1, ...trend.map((t) => t.value)), [trend]);

  const highest = useMemo(() => categoryBreakdown[0] ?? null, [categoryBreakdown]);

  const recent = useMemo(() => periodExpenses.slice(0, 6), [periodExpenses]);

  if (loading) {
    return (
      <ThemedScreen contentContainerStyle={{ paddingBottom: spacing.massive + 92 }}>
        <FadeInView delay={0}>
          <View style={styles.header}>
            <ThemedText variant="heading" color={colors.text}>
              Reports
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted}>
              Understand where your money goes.
            </ThemedText>
          </View>
        </FadeInView>
        <FadeInView delay={60}>
          <View style={styles.skeletonCard} />
        </FadeInView>
        <FadeInView delay={120}>
          <View style={styles.skeletonCardTall} />
        </FadeInView>
      </ThemedScreen>
    );
  }

  if (error) {
    return (
      <ThemedScreen contentContainerStyle={{ paddingBottom: spacing.massive + 92 }}>
        <FadeInView delay={0}>
          <View style={styles.header}>
            <ThemedText variant="heading" color={colors.text}>
              Reports
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted}>
              Understand where your money goes.
            </ThemedText>
          </View>
        </FadeInView>
        <FadeInView delay={60}>
          <GlassCard style={styles.stateCard}>
            <ThemedText variant="subheading" color={colors.text}>
              Unable to load reports
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted} style={styles.stateText}>
              We couldn&apos;t load your spending data.
            </ThemedText>
            <GlassButton
              title="Try again"
              variant="secondary"
              onPress={() => refetch()}
              style={styles.retryButton}
            />
          </GlassCard>
        </FadeInView>
      </ThemedScreen>
    );
  }

  const hasData = periodExpenses.length > 0;

  return (
    <ThemedScreen scroll contentContainerStyle={{ paddingBottom: spacing.massive + 92 }}>
      <FadeInView delay={0}>
        <View style={styles.header}>
          <ThemedText variant="heading" color={colors.text}>
            Reports
          </ThemedText>
          <ThemedText variant="caption" color={colors.textMuted}>
            Understand where your money goes.
          </ThemedText>
        </View>
      </FadeInView>

      <FadeInView delay={40}>
        <View style={styles.chips}>
          {PERIODS.map((option) => (
            <GlassChip
              key={option.key}
              label={option.label}
              selected={period === option.key}
              onPress={() => setPeriod(option.key)}
            />
          ))}
        </View>
      </FadeInView>

      {!hasData ? (
        <FadeInView delay={80}>
          <GlassCard style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons name="stats-chart-outline" size={iconSizes.xl} color={colors.accentStrong} />
            </View>
            <ThemedText variant="subheading" color={colors.text}>
              Nothing to report yet
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted} style={styles.stateText}>
              Add an expense and your spending insights will appear here.
            </ThemedText>
            <GlassButton
              title="Add Expense"
              variant="secondary"
              onPress={() => router.push('/expense/add')}
              style={styles.retryButton}
            />
          </GlassCard>
        </FadeInView>
      ) : (
        <>
          <FadeInView delay={80} style={styles.section}>
            <GlassCard>
              <ThemedText variant="caption" color={colors.textMuted}>
                Total spent
              </ThemedText>
              <ThemedText variant="title" color={colors.text} style={styles.totalValue}>
                {formatCurrency(total)}
              </ThemedText>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <ThemedText variant="caption" color={colors.textMuted}>
                    {count} {count === 1 ? 'expense' : 'expenses'}
                  </ThemedText>
                </View>
                <View style={styles.summaryItemRight}>
                  <ThemedText variant="caption" color={colors.textMuted}>
                    {formatCurrency(Math.round(average))} average
                  </ThemedText>
                </View>
              </View>
            </GlassCard>
          </FadeInView>

          <GlassSection title="Spending by category">
            <FadeInView delay={120}>
              <GlassCard>
                {categoryBreakdown.map((item, index) => {
                  const normalized = Math.max(0, Math.min(100, item.percent));
                  return (
                    <View key={item.category}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <View style={styles.categoryRow}>
                        <CategoryIcon category={item.category} />
                        <View style={styles.categoryMeta}>
                          <View style={styles.categoryLine}>
                            <ThemedText variant="bodyMedium" color={colors.text} numberOfLines={1}>
                              {item.category}
                            </ThemedText>
                            <ThemedText variant="bodyMedium" color={colors.text}>
                              {formatCurrency(item.total)}
                            </ThemedText>
                          </View>
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  backgroundColor: CATEGORY_COLORS[item.category] ?? colors.accent,
                                  width: `${normalized}%`,
                                },
                              ]}
                            />
                          </View>
                          <ThemedText variant="caption" color={colors.textMuted}>
                            {Number.isFinite(normalized) ? `${Math.round(normalized)}%` : '0%'}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </GlassCard>
            </FadeInView>
          </GlassSection>

          <GlassSection title="Personal vs Shared">
            <FadeInView delay={160}>
              <GlassCard>
                <View style={styles.vsRow}>
                  <View style={styles.vsItem}>
                    <ThemedText variant="caption" color={colors.textMuted}>
                      Personal
                    </ThemedText>
                    <ThemedText variant="subheading" color={colors.text}>
                      {formatCurrency(myPersonalTotal)}
                    </ThemedText>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.vsItem}>
                    <ThemedText variant="caption" color={colors.textMuted}>
                      Shared
                    </ThemedText>
                    <ThemedText variant="subheading" color={colors.text}>
                      {formatCurrency(sharedTotal)}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.vsBar}>
                  <View
                    style={[
                      styles.vsBarPersonal,
                      total > 0 ? { flex: myPersonalTotal / total } : { flex: 0 },
                    ]}
                  />
                  <View
                    style={[
                      styles.vsBarShared,
                      total > 0 ? { flex: sharedTotal / total } : { flex: 0 },
                    ]}
                  />
                </View>
              </GlassCard>
            </FadeInView>
          </GlassSection>

          <GlassSection title="Spending trend">
            <FadeInView delay={200}>
              <GlassCard>
                {trend.length === 0 ? (
                  <ThemedText variant="body" color={colors.textMuted}>
                    No spending data for this period.
                  </ThemedText>
                ) : (
                  <View style={styles.chart}>
                    {trend.map((point, idx) => {
                      const height = Math.max(4, (point.value / trendMax) * 120);
                      return (
                        <View key={`${idx}-${point.label}`} style={styles.chartCol}>
                          <View style={styles.chartBarSlot}>
                            <View style={[styles.chartBar, { height }]} />
                          </View>
                          <ThemedText variant="label" color={colors.textMuted} numberOfLines={1}>
                            {point.label}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </View>
                )}
              </GlassCard>
            </FadeInView>
          </GlassSection>

          {highest && highest.total > 0 ? (
            <GlassSection title="Highest spending">
              <FadeInView delay={240}>
                <GlassCard style={styles.highestRow}>
                  <CategoryIcon category={highest.category} size={iconSizes.lg} />
                  <View style={styles.highestMeta}>
                    <ThemedText variant="bodyMedium" color={colors.text}>
                      {highest.category}
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.textMuted}>
                      {Math.round(highest.percent)}% of your spending
                    </ThemedText>
                  </View>
                  <ThemedText variant="subheading" color={colors.text}>
                    {formatCurrency(highest.total)}
                  </ThemedText>
                </GlassCard>
              </FadeInView>
            </GlassSection>
          ) : null}

          <GlassSection title="Recent spending">
            <FadeInView delay={280}>
              <GlassCard padding={spacing.sm}>
                {recent.map((expense, index) => (
                  <View key={expense.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: '/expense/details', params: { id: expense.id } })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${expense.category}, ${formatCurrency(expense.amount)}`}
                      style={({ pressed }) => [styles.expenseRow, pressed && styles.rowPressed]}
                    >
                      <CategoryIcon category={expense.category} />
                      <View style={styles.expenseMeta}>
                        <View style={styles.expenseLine}>
                          <ThemedText variant="bodyMedium" color={colors.text} numberOfLines={1}>
                            {expense.category}
                          </ThemedText>
                          <View style={styles.expenseBadge}>
                            <ThemedText variant="label" color={colors.textSecondary}>
                              {expense.type === 'shared' ? 'Shared' : 'Personal'}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText variant="caption" color={colors.textMuted} numberOfLines={1}>
                          {expense.note || formatDateLabel(expense.date)}
                        </ThemedText>
                      </View>
                      <ThemedText variant="bodyMedium" color={colors.text}>
                        {formatCurrency(expense.amount)}
                      </ThemedText>
                    </Pressable>
                  </View>
                ))}
              </GlassCard>
            </FadeInView>
          </GlassSection>
        </>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  totalValue: {
    marginTop: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  summaryItem: {
    flex: 1,
  },
  summaryItemRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  categoryMeta: {
    flex: 1,
  },
  categoryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vsItem: {
    flex: 1,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
  vsBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: spacing.md,
    backgroundColor: colors.accentSoft,
  },
  vsBarPersonal: {
    backgroundColor: colors.accent,
  },
  vsBarShared: {
    backgroundColor: colors.accentStrong,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    height: 160,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  chartBarSlot: {
    height: 120,
    justifyContent: 'flex-end',
    width: '100%',
  },
  chartBar: {
    width: '60%',
    alignSelf: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  highestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  highestMeta: {
    flex: 1,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  expenseMeta: {
    flex: 1,
  },
  expenseLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  expenseBadge: {
    backgroundColor: colors.tint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  stateCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stateText: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  retryButton: {
    marginTop: spacing.lg,
    minWidth: 140,
  },
  skeletonCard: {
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  skeletonCardTall: {
    height: 260,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
});
