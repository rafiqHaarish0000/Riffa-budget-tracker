import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { useNotifications } from '../../hooks/useNotifications';
import { ThemedText } from '../ui/ThemedText';

/**
 * Bell with an unread-count badge for the Home header. Uses the same
 * `useNotifications` hook as the notifications screen so the badge reflects
 * the current unread count, refreshed on focus. Badge: none when 0, exact for
 * 1–9, and "9+" beyond.
 */
export function NotificationsBell() {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  const badge =
    unreadCount === 0 ? null : unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
      }
      hitSlop={8}
      style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
    >
      <Ionicons name="notifications-outline" size={iconSizes.lg} color={colors.text} />
      {badge ? (
        <View style={styles.badge}>
          <ThemedText variant="captionBold" color={colors.textInverse} style={styles.badgeText}>
            {badge}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
