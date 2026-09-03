import { Platform } from 'react-native';
import type { PushPlatform } from '../types/push-notification';

export type PushPermissionStatus = 'undetermined' | 'denied' | 'granted' | 'unsupported';

export type PushSupportResult = {
  supported: boolean;
  platform: PushPlatform;
  reason: 'ios-dev' | 'unsupported';
};

export type RegisterPushResult = {
  ok: boolean;
  status: PushPermissionStatus;
  /** Present only when a real token is successfully registered. Always false today. */
  registered: false;
  reason?: string;
};

/**
 * Push notifications are intentionally NOT enabled yet.
 *
 * This module is the single seam where a real push provider (Expo Notifications
 * / FCM / APNs) will later plug in. Until then every function returns a safe,
 * deterministic "not configured / unsupported" result:
 *
 *   - It never requests OS notification permission.
 *   - It never shows a permission dialog.
 *   - It never mints or registers a fake token.
 *   - It never reaches any network or push service.
 *
 * It can therefore be called unconditionally from future onboarding UI without
 * side effects, and without breaking Expo web / static export.
 */

/** True when push delivery is wired up. Hard-coded off until a provider is added. */
const PUSH_CONFIGURED = false as const;

/** Maps the current runtime to a push-platform the future provider will target. */
export function currentPushPlatform(): PushPlatform {
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  if (Platform.OS === 'android') {
    return 'android';
  }
  return 'web';
}

/** True only on native builds where push could be delivered after configuration. */
export function isPushNotificationsSupported(): PushSupportResult {
  if (!PUSH_CONFIGURED) {
    return { supported: false, platform: currentPushPlatform(), reason: 'unsupported' };
  }
  const platform = currentPushPlatform();
  if (platform === 'ios' || platform === 'android') {
    return { supported: true, platform, reason: 'ios-dev' };
  }
  return { supported: false, platform, reason: 'unsupported' };
}

/**
 * Current permission status WITHOUT triggering a system prompt.
 *
 * While push is unconfigured this never inspects real OS permission state (no
 * direct dependency yet), so on native it reports an honest "not configured"
 * status rather than a misleading one.
 */
export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const { supported } = isPushNotificationsSupported();
  if (!supported) {
    return 'unsupported';
  }
  // Future: swap this for expo-notifications getPermissionsAsync() (non-prompting).
  return 'undetermined';
}

/**
 * Registers this device for push.
 *
 * Inert until a provider is configured. It deliberately does NOT request
 * permission, does NOT attempt token registration, and does NOT fabricate a
 * token. It always reports failure-with-reason so callers can surface a truthful
 * "not available yet" instead of a fake success.
 */
export async function registerForPushNotifications(): Promise<RegisterPushResult> {
  const { supported, reason } = isPushNotificationsSupported();
  if (!supported) {
    return { ok: false, status: 'unsupported', registered: false, reason };
  }
  // Future: request permission via expo-notifications requestPermissionsAsync()
  // at the correct UX point, obtain the token, then persist via our secure RLS
  // path (see docs/push-notifications.md). Until then we signpost the next step.
  return {
    ok: false,
    status: 'undetermined',
    registered: false,
    reason: 'push-not-configured',
  };
}

/**
 * Removes this device's registration.
 *
 * Safe no-op today (nothing is registered). Future: deactivate the stored token
 * server-side only, never accept an arbitrary target from the client.
 */
export async function unregisterPushNotifications(): Promise<void> {
  // Nothing stored yet — intentionally a no-op.
  return;
}