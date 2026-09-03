import { Stack } from 'expo-router';
import { RequireAuth } from '../../components/RouteGuard';
import { colors, typography } from '../../constants/theme';

export default function SavingsLayout() {
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
      <Stack.Screen name="create" options={{ headerShown: false }} />
      <Stack.Screen name="details" options={{ title: 'Savings Goal' }} />
      </Stack>
    </RequireAuth>
  );
}
