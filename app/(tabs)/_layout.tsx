import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingAddButton } from '../../components/navigation/FloatingAddButton';
import { RequireAuth } from '../../components/RouteGuard';
import { colors, iconSizes, radius, shadows, spacing, typography } from '../../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_BAR_BASE_HEIGHT = 76;
const TAB_BAR_GUTTER = 10;

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
      style={[styles.overlay, { bottom: Math.max(insets.bottom, TAB_BAR_GUTTER) + TAB_BAR_BASE_HEIGHT - 22 }]}
    >
      <FloatingAddButton onPress={onPress} />
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <RequireAuth>
      <View style={styles.root}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.white,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarStyle: [styles.tabBar, { height: TAB_BAR_BASE_HEIGHT, bottom: Math.max(insets.bottom, TAB_BAR_GUTTER) }],
            tabBarItemStyle: styles.tabBarItem,
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
    left: TAB_BAR_GUTTER,
    right: TAB_BAR_GUTTER,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.xxl,
    backgroundColor: '#07120E',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    ...shadows.float,
  },
  tabBarItem: {
    justifyContent: 'center',
    borderRadius: radius.md,
    marginHorizontal: 2,
  },
  tabBarLabel: {
    ...typography.label,
    marginTop: 2,
  },
});
