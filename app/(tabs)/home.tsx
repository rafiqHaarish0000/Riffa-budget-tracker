import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GlassAvatar, GlassCard, GlassChip, GlassSection } from '../../components/ui/glass';
import { ScreenState, ScreenStateSkeleton } from '../../components/ui/ScreenState';
import { NotificationsBell } from '../../components/notifications/NotificationsBell';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { BudgetCard } from '../../components/dashboard/BudgetCard';
import { BreakdownCard } from '../../components/dashboard/BreakdownCard';
import { ExpenseList } from '../../components/dashboard/ExpenseList';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { OverviewCard } from '../../components/dashboard/OverviewCard';
import { SavingsPreviewCard } from '../../components/dashboard/SavingsPreviewCard';
import { colors, spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { DEFAULT_DAILY_BUDGET, getDailyBudget, getMonthlyIncome } from '../../lib/settings';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../hooks/useExpenses';
import { useFamily } from '../../hooks/useFamily';
import { useSavings } from '../../hooks/useSavings';
import { sumExpenses } from '../../utils/format';

type FamilyFilter = 'you' | 'partner' | 'shared';

function pad(n: number): string {
  return `${n}`.padStart(2, '0');
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthKey(d: Date): string {
  return dayKey(d).slice(0, 7);
}

function monthStart(d: Date): string {
  return `${monthKey(d)}-01`;
}

function nextMonthStart(d: Date): string {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${pad(nextMonth)}-01`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    members,
    loading: familyLoading,
    error: familyError,
    refetch: refetchFamily,
  } = useFamily(user);
  const {
    expenses,
    paymentsByExpense,
    loading: expensesLoading,
    error: expensesError,
    refetch: refetchExpenses,
  } = useExpenses(user?.family_id ?? null, user?.id ?? null);
  const {
    goals,
    loading: savingsLoading,
    error: savingsError,
    refetch: refetchSavings,
  } = useSavings(user?.family_id ?? null, user?.id ?? null);

  const [filter, setFilter] = useState<FamilyFilter>('you');
  const [budget, setBudget] = useState<number>(DEFAULT_DAILY_BUDGET);
  const [income, setIncome] = useState<number | null>(null);
  const [savingsThisMonth, setSavingsThisMonth] = useState(0);

  useEffect(() => {
    getDailyBudget().then(setBudget);
    getMonthlyIncome().then(setIncome);
  }, []);

  const familyId = user?.family_id ?? null;

  useEffect(() => {
    let active = true;
    if (!familyId) {
      setSavingsThisMonth(0);
      return;
    }
    (async () => {
      const { data: familyGoals } = await supabase
        .from('savings_goals')
        .select('id')
        .eq('family_id', familyId);
      if (!active) {
        return;
      }
      const goalIds = (familyGoals ?? []).map((goal) => goal.id);
      if (goalIds.length === 0) {
        setSavingsThisMonth(0);
        return;
      }
      const { data: contributions } = await supabase
        .from('savings_contributions')
        .select('amount')
        .in('goal_id', goalIds)
        .gte('date', monthStart(new Date()))
        .lt('date', nextMonthStart(new Date()));
      if (active) {
        setSavingsThisMonth(
          (contributions ?? []).reduce((acc, contribution) => acc + (contribution.amount ?? 0), 0),
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [familyId]);

  useFocusEffect(
    useCallback(() => {
      refetchExpenses();
      refetchSavings();
      refetchFamily();
      getDailyBudget().then(setBudget);
      getMonthlyIncome().then(setIncome);
    }, [refetchExpenses, refetchSavings, refetchFamily]),
  );

  const partner = useMemo(
    () => members.find((member) => member.user_id !== user?.id) ?? null,
    [members, user?.id],
  );
  const partnerId = partner?.user_id ?? null;
  const partnerName = partner?.user?.name?.trim().split(/\s+/)[0] || null;

  const homeError = expensesError ?? savingsError ?? familyError;

  const now = new Date();
  const today = dayKey(now);
  const month = monthKey(now);

  const todayExpenses = expenses.filter((expense) => (expense.date ?? '').slice(0, 10) === today);
  const monthExpenses = expenses.filter(
    (expense) => (expense.date ?? '').slice(0, 7) === month,
  );

  const filteredToday =
    filter === 'you'
      ? todayExpenses.filter((expense) => expense.user_id === user?.id)
      : filter === 'partner'
        ? todayExpenses.filter(
            (expense) => expense.type === 'shared' && expense.user_id === partnerId,
          )
        : todayExpenses.filter((expense) => expense.type === 'shared');

  const spentToday = sumExpenses(todayExpenses);
  const monthlyExpensesTotal = sumExpenses(monthExpenses);
  const myPersonalMonth = sumExpenses(
    monthExpenses.filter(
      (expense) => expense.type === 'personal' && expense.user_id === user?.id,
    ),
  );
  const sharedMonth = sumExpenses(
    monthExpenses.filter((expense) => expense.type === 'shared'),
  );

  const remaining = income === null ? null : income - monthlyExpensesTotal - savingsThisMonth;
  const previewGoals = useMemo(
    () =>
      [...goals].sort((a, b) => (b.current_amount ?? 0) - (a.current_amount ?? 0)),
    [goals],
  );

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const heading = firstName ? `${greeting}, ${firstName}` : greeting;
  const dateLabel = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <ThemedScreen
      scroll
      contentContainerStyle={{ paddingBottom: spacing.massive + 92 }}
    >
      <FadeInView delay={0}>
        <View style={styles.header}>
          <View style={styles.headerMeta}>
            <ThemedText variant="heading" color={colors.text} numberOfLines={1}>
              {heading}
            </ThemedText>
            <ThemedText variant="caption" color={colors.textMuted}>
              {dateLabel}
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <NotificationsBell />
            <Pressable
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              style={({ pressed }) => pressed && styles.pressed}
            >
              <GlassAvatar uri={user?.profile_image_url} name={user?.name} size={44} />
            </Pressable>
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={60} style={styles.sectionGap}>
        {homeError ? (
          <ScreenState
            kind="error"
            compact
            contained
            title="Couldn't load your dashboard"
            message="Check your connection and try again."
            actionLabel="Try again"
            actionVariant="secondary"
            onAction={() => {
              refetchExpenses();
              refetchSavings();
              refetchFamily();
            }}
          />
        ) : expensesLoading ? (
          <ScreenStateSkeleton rows={3} tall />
        ) : (
          <BudgetCard budget={budget} spent={spentToday} />
        )}
      </FadeInView>

      <GlassSection title="Today's expenses">
        <FadeInView delay={120}>
          <View style={styles.chips}>
            <GlassChip label="You" selected={filter === 'you'} onPress={() => setFilter('you')} />
            {partnerId ? (
              <GlassChip
                label={partnerName ?? 'Wife'}
                selected={filter === 'partner'}
                onPress={() => setFilter('partner')}
              />
            ) : null}
            <GlassChip
              label="Shared"
              selected={filter === 'shared'}
              onPress={() => setFilter('shared')}
            />
          </View>
          <View style={styles.cardGap}>
            {expensesLoading ? (
              <ScreenStateSkeleton rows={3} />
            ) : (
              <ExpenseList
                expenses={filteredToday}
                onPressExpense={(id) =>
                  router.push({ pathname: '/expense/details', params: { id } })
                }
                onAddExpense={() => router.push('/expense/add')}
                paymentsByExpense={paymentsByExpense}
                members={members}
                currentUserId={user?.id ?? null}
              />
            )}
          </View>
        </FadeInView>
      </GlassSection>

      <GlassSection title="Monthly overview">
        <FadeInView delay={180}>
          {expensesLoading || savingsLoading ? (
            <ScreenStateSkeleton rows={2} />
          ) : homeError ? (
            <ScreenState
              kind="empty"
              compact
              contained
              title="No spending data yet"
              message="Your overview will appear once expenses are loaded."
            />
          ) : (
            <OverviewCard
              income={income}
              expenses={monthlyExpensesTotal}
              savings={savingsThisMonth}
              remaining={remaining}
            />
          )}
        </FadeInView>
      </GlassSection>

      <GlassSection title="Spending breakdown">
        <FadeInView delay={240}>
          {expensesLoading ? (
            <ScreenStateSkeleton rows={2} />
          ) : (
            <BreakdownCard personal={myPersonalMonth} shared={sharedMonth} />
          )}
        </FadeInView>
      </GlassSection>

      <GlassSection title="Savings">
        <FadeInView delay={300}>
          {savingsLoading ? (
            <ScreenStateSkeleton rows={2} />
          ) : (
            <SavingsPreviewCard
              goals={previewGoals}
              onViewAll={() => router.push('/(tabs)/savings')}
              onCreateGoal={() => router.push('/savings/create')}
            />
          )}
        </FadeInView>
      </GlassSection>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerMeta: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  sectionGap: {
    marginTop: spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardGap: {
    marginTop: spacing.md,
  },
});