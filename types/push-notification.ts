/**
 * Future-ready types for device push-notification tokens.
 *
 * NOT YET ACTIVE. Push delivery is intentionally not enabled. This file only
 * establishes the contract a future implementation can rely on once a push
 * provider (e.g. Expo Notifications + FCM/APNs) is wired in. It is inert today.
 *
 * A token row is never stored client-side as a secret, and the token value
 * itself is treated as opaque — never logged, never rendered.
 */

/**
 * Push platform identifiers. Chosen to be provider-agnostic so the value stored
 * in the database is independent of any specific vendor's token format.
 */
export type PushPlatform = 'ios' | 'android' | 'web';

/**
 * A device's native push token as persisted server-side. Intended to line up
 * with a `public.push_tokens` table (see `supabase/migrations/0001_...`).
 */
export type PushToken = {
  id: string;
  user_id: string;
  /**
   * Opaque device token supplied by the push provider. Never a secret we mint,
   * but still treated as sensitive — it identifies a deliverable device.
   */
  push_token: string;
  platform: PushPlatform;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Fields a client is allowed to submit when registering a token. */
export type NewPushTokenInput = {
  push_token: string;
  platform: PushPlatform;
};