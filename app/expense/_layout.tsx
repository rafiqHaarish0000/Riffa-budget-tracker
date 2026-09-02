import { Stack } from 'expo-router';
import { RequireAuth } from '../../components/RouteGuard';
import { colors, typography } from '../../constants/theme';

export default function ExpenseLayout() {
  return (
    <RequireAuth>
      <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, ...typography.bodyMedium },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="add" options={{ title: 'Add Expense' }} />
      <Stack.Screen name="details" options={{ title: 'Expense details' }} />
      </Stack>
    </RequireAuth>
  );
}
