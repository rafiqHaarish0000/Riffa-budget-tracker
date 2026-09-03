import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { FadeInView } from '../../components/dashboard/FadeInView';
import { GlassCard } from '../../components/ui/glass';
import { ScreenState, ScreenStateSkeleton } from '../../components/ui/ScreenState';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { useNotifications } from '../../hooks/useNotifications';
import { formatRelativeTime } from '../../utils/date';
import type { AppNotification, NotificationType } from '../../types/notification';

/**
 * Internal app navigation is restriction-enforced: a stored `route` is only
 * followed if it matches one of these known prefixes. Anything else (including
 * any external/scheme URL) is ignored, so a notification can never drive the
 * app to an unexpected destination.
 */
const SAFE_ROUTE_PREFIXES = [
  '/expense/details?id=',
  '/savings/details?id=',
  '/profile/family',
] as const;

function safeHref(route: string | null): Href | null {
  if (!route) {
    return null;
  }
  const match = SAFE_ROUTE_PREFIXES.find((prefix) =>
    route === prefix || route.startsWith(prefix),
  );
  if (match === '/profile/family') {
    return '/profile/family';
  }
  if (match) {
    // Rebuild from a known base + only the id param.
    const id = route.slice(match.length).split('&')[0];
    if (!id) {
      return null;
    }
    return match.startsWith('/expense')
      ? { pathname: '/expense/details', params: { id } }
      : { pathname: '/savings/details', params: { id } };
  }
  return null;
}

function iconFor(type: NotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'savings_contribution_added':
      return 'trending-up-outline';
    case 'system':
      return 'notifications-outline';
    default:
      return 'card-outline';
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (loading && notifications.length === 0) {
    return (
      <ThemedScreen scroll>
        <FadeInView delay={0}>
          <ScreenStateSkeleton rows={3} />
        </FadeInView>
      </ThemedScreen>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <ThemedScreen scroll>
        <FadeInView delay={0}>
          <ScreenState
            kind="error"
            contained={false}
            title="Couldn’t load notifications"
            message="Check your connection and try again."
            actionLabel="Try again"
            actionVariant="secondary"
            onAction={() => refresh()}
          />
        </FadeInView>
      </ThemedScreen>
    );
  }

  if (notifications.length === 0) {
    return (
      <ThemedScreen scroll>
        <FadeInView delay={0}>
          <ScreenState
            kind="empty"
            contained={false}
            icon="notifications-off-outline"
            title="You're all caught up"
            message="New shared activity will appear here."
          />
        </FadeInView>
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={loading}
            onRefresh={() => refresh()}
            tintColor={colors.accent}
          />
        ),
      }}
    >
      {unreadCount > 0 ? (
        <FadeInView delay={0}>
          <Pressable
            onPress={() => markAllAsRead()}
            accessibilityRole="button"
            accessibilityLabel={`Mark all ${unreadCount} notifications as read`}
            style={({ pressed }) => [styles.markAllRow, pressed && styles.pressed]}
          >
            <Ionicons name="checkmark-done-outline" size={iconSizes.md} color={colors.accentStrong} />
            <ThemedText variant="bodyMedium" color={colors.accentStrong}>
              Mark all as read
            </ThemedText>
          </Pressable>
        </FadeInView>
      ) : null}

      <View style={styles.list}>
        {notifications.map((notification, index) => (
          <FadeInView key={notification.id} delay={Math.min(index, 6) * 40}>
            <NotificationRow
              notification={notification}
              onPress={() => {
                markAsRead(notification.id);
                const href = safeHref(notification.route);
                if (href) {
                  router.push(href);
                }
              }}
              onDismiss={() => deleteNotification(notification.id)}
            />
          </FadeInView>
        ))}
      </View>
    </ThemedScreen>
  );
}

function NotificationRow({
  notification,
  onPress,
  onDismiss,
}: {
  notification: AppNotification;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const unread = !notification.is_read;
  return (
    <GlassCard
      padding={spacing.lg}
      style={[styles.row, ...(unread ? [styles.rowUnread] : [])]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${notification.title}. ${notification.message}`}
        style={styles.rowBody}
      >
        <View style={[styles.iconWrap, unread && styles.iconWrapUnread]}>
          <Ionicons
            name={iconFor(notification.type)}
            size={iconSizes.md}
            color={unread ? colors.accentStrong : colors.textSecondary}
          />
        </View>
        <View style={styles.rowText}>
          <View style={styles.rowTitleLine}>
            <ThemedText
              variant="bodyMedium"
              color={colors.text}
              numberOfLines={1}
              style={styles.rowTitle}
            >
              {notification.title}
            </ThemedText>
            {unread ? <View style={styles.unreadDot} /> : null}
          </View>
          <ThemedText
            variant="caption"
            color={colors.textSecondary}
            numberOfLines={2}
            style={styles.rowMessage}
          >
            {notification.message}
          </ThemedText>
          <ThemedText variant="labelRegular" color={colors.textMuted}>
            {formatRelativeTime(notification.created_at)}
          </ThemedText>
        </View>
      </Pressable>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        hitSlop={8}
        style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
      >
        <Ionicons name="close-outline" size={iconSizes.sm} color={colors.textMuted} />
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  markAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowUnread: {
    borderColor: colors.accent,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: {
    backgroundColor: colors.accentSoft,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: {
    flexShrink: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accentStrong,
  },
  rowMessage: {
    marginTop: spacing.xxs,
  },
  dismiss: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
