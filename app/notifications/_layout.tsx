import { Stack } from 'expo-router';
import { RequireAuth } from '../../components/RouteGuard';
import { colors, typography } from '../../constants/theme';

export default function NotificationsLayout() {
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
        <Stack.Screen name="index" options={{ title: 'Notifications' }} />
      </Stack>
    </RequireAuth>
  );
}
