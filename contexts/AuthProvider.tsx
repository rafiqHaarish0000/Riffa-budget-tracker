import * as AppleAuthentication from 'expo-apple-authentication';
import { PropsWithChildren, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { User } from '../types/user';
import {
  AuthContext,
  setOnboardingCompleted,
  type AuthContextValue,
  type SignInWithAppleResult,
} from './AuthContext';

type AuthProviderProps = PropsWithChildren<{
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshProfile: AuthContextValue['refreshProfile'];
}>;

const GENERIC_ERROR =
  "We couldn't complete Apple sign-in. Please try again.";
const NOT_CONFIGURED_ERROR =
  'Apple sign-in is not configured yet. Add your Supabase credentials to enable it.';

// The fallback client and the web OAuth handoff both resolve in a few
// milliseconds. Hold the loading state long enough for it to be perceivable.
const MIN_SIGN_IN_VISIBLE_MS = 350;

function isAppleCancellation(err: unknown): boolean {
  const code =
    (err as { code?: string })?.code ??
    (err as { errorCode?: string })?.errorCode ??
    String((err as { message?: string })?.message ?? '');
  return (
    code === 'ERR_REQUEST_CANCELED' ||
    code === 'ERR_CANCELED' ||
    code === '1001' ||
    /(cancelled|canceled)/i.test(code)
  );
}

export function AuthProvider({
  children,
  user,
  session,
  loading,
  refreshProfile,
}: AuthProviderProps) {
  const [signingIn, setSigningIn] = useState(false);

  async function nativeAppleSignIn(): Promise<SignInWithAppleResult> {
    if (!isSupabaseConfigured) {
      return { status: 'error', message: NOT_CONFIGURED_ERROR };
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { status: 'error', message: GENERIC_ERROR };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        return { status: 'error', message: GENERIC_ERROR };
      }

      return { status: 'success' };
    } catch (err) {
      if (isAppleCancellation(err)) {
        return { status: 'cancelled' };
      }
      return { status: 'error', message: GENERIC_ERROR };
    }
  }

  // Web (Safari/PWA/future web) uses the OAuth "/authorize" flow through a
  // Supabase redirect. Sessions come back and are persisted via the callback.
  async function webAppleSignIn(): Promise<SignInWithAppleResult> {
    if (!isSupabaseConfigured) {
      return { status: 'error', message: NOT_CONFIGURED_ERROR };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: getWebRedirectUrl() },
      });

      if (error) {
        return { status: 'error', message: GENERIC_ERROR };
      }

      // If no error was returned, the OAuth window was opened and Supabase will
      // redirect back with the session once the user finishes signing in.
      return { status: 'success' };
    } catch (err) {
      if (isAppleCancellation(err)) {
        return { status: 'cancelled' };
      }
      return { status: 'error', message: GENERIC_ERROR };
    }
  }

  const signInWithApple = async (): Promise<SignInWithAppleResult> => {
    if (signingIn) {
      return { status: 'cancelled' };
    }
    setSigningIn(true);
    const startedAt = Date.now();
    try {
      const result =
        Platform.OS === 'web' ? await webAppleSignIn() : await nativeAppleSignIn();

      // Keep the loading state visibly "Connecting…" for a minimum duration so
      // users perceive the attempt even when it fails or resolves instantly.
      const remaining = MIN_SIGN_IN_VISIBLE_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      return result;
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    await setOnboardingCompleted(false);
  };

  const completeOnboarding = async (): Promise<void> => {
    await setOnboardingCompleted(true);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signingIn,
      signInWithApple,
      signOut,
      completeOnboarding,
      refreshProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, session, loading, signingIn, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function getWebRedirectUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return `${window.location.origin}${window.location.pathname}`;
}
