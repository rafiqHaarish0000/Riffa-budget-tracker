import { Stack } from 'expo-router';
import { GuestOnly } from '../../components/RouteGuard';
import { colors } from '../../constants/theme';

export default function AuthLayout() {
  return (
    <GuestOnly>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
        }}
      />
    </GuestOnly>
  );
}
