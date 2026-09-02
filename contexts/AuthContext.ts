import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';
import type { User } from '../types/user';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuthContext must be used within <AuthProvider>');
  }
  return value;
}

export function getStoredAuthSessionKey(): string {
  return 'supabase.auth.token';
}

export function getStoredOnboardingKey(): string {
  return 'riffa.onboarding.completed';
}

export async function setOnboardingCompleted(value: boolean): Promise<void> {
  await AsyncStorage.setItem(getStoredOnboardingKey(), String(value));
}

export async function getOnboardingCompleted(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(getStoredOnboardingKey());
  return raw === 'true';
}

/**
 * Result of a Sign in with Apple attempt. Consumers surface a clean message
 * based on `status` without leaking technical Supabase / OS errors to the user.
 */
export type SignInWithAppleResult =
  | { status: 'success' }
  | { status: 'cancelled' } // user dismissed the Apple sheet — no error to show
  | { status: 'error'; message: string };

export type AuthContextValue = {
  /** The authenticated RIFAA user profile, or null when logged out / new. */
  user: User | null;
  /** The persistent Supabase auth session, or null when logged out. */
  session: Session | null;
  /** True until the initial session restore and profile lookup have resolved. */
  loading: boolean;
  /** True when an Apple sign-in attempt is currently in flight. */
  signingIn: boolean;
  signInWithApple: () => Promise<SignInWithAppleResult>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  /**
   * Re-fetch the authenticated user's RIFAA profile from Supabase and update
   * the context. Used after family create/join so `user.family_id` is current
   * and route guards can route to Home. Resolves with the fresh profile, or
   * null when the profile row is missing / the user is signed out.
   */
  refreshProfile: () => Promise<User | null>;
};

/**
 * Decide where a signed-in user should land.
 * - no session         -> null (go to intro)
 * - session, no family -> create/join family onboarding (new user)
 * - session + family   -> home (existing user)
 */
export function resolveAuthedRoute(session: Session | null, user: User | null): string | null {
  if (!session) {
    return null;
  }
  if (!user || !user.family_id) {
    return '/(auth)/create-family';
  }
  return '/(tabs)/home';
}
