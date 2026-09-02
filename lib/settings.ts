import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_BUDGET_KEY = 'riffa.dailyBudget';
const MONTHLY_INCOME_KEY = 'riffa.monthlyIncome';

export const DEFAULT_DAILY_BUDGET = 2000;

export async function getDailyBudget(): Promise<number> {
  const raw = await AsyncStorage.getItem(DAILY_BUDGET_KEY);
  if (raw === null) {
    return DEFAULT_DAILY_BUDGET;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_DAILY_BUDGET;
}

export async function setDailyBudget(value: number): Promise<void> {
  await AsyncStorage.setItem(DAILY_BUDGET_KEY, String(Math.max(0, Math.round(value))));
}

export async function getMonthlyIncome(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(MONTHLY_INCOME_KEY);
  if (raw === null) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function setMonthlyIncome(value: number | null): Promise<void> {
  if (value === null) {
    await AsyncStorage.removeItem(MONTHLY_INCOME_KEY);
    return;
  }
  await AsyncStorage.setItem(MONTHLY_INCOME_KEY, String(Math.max(0, Math.round(value))));
}