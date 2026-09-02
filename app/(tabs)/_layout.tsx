import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingAddButton } from '../../components/navigation/FloatingAddButton';
import { RequireAuth } from '../../components/RouteGuard';
import { colors, fontFamily, iconSizes, spacing, typography } from '../../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: IconName, unfocused: IconName) {
  return function TabIcon({ color, focused: isFocused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={isFocused ? focused : unfocused} size={iconSizes.lg} color={color} />;
  };
}

function AddExpenseOverlay({ onPress }: { onPress?: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.overlay, { bottom: (insets.bottom || spacing.sm) + 44 }]}
    >
      <FloatingAddButton onPress={onPress} />
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  return (
    <RequireAuth>
      <View style={styles.root}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: styles.tabBarLabel,
            tabBarHideOnKeyboard: true,
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: 'Home',
              tabBarIcon: tabIcon('home', 'home-outline'),
            }}
          />
          <Tabs.Screen
            name="calendar"
            options={{
              title: 'Calendar',
              tabBarIcon: tabIcon('calendar', 'calendar-outline'),
            }}
          />
          <Tabs.Screen
            name="reports"
            options={{
              title: 'Reports',
              tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline'),
            }}
          />
          <Tabs.Screen
            name="savings"
            options={{
              title: 'Savings',
              tabBarIcon: tabIcon('wallet', 'wallet-outline'),
            }}
          />
        </Tabs>
        <AddExpenseOverlay onPress={() => router.push('/expense/add')} />
      </View>
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  tabBar: {
    position: 'absolute',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    height: 64,
    paddingTop: spacing.xs,
    elevation: 0,
  },
  tabBarLabel: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600',
  },
});
