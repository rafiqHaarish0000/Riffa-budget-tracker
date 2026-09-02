import { Stack } from 'expo-router';
import { RequireAuth } from '../../components/RouteGuard';
import { colors, typography } from '../../constants/theme';

export default function ProfileLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="family" options={{ title: 'Family' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </RequireAuth>
  );
}
