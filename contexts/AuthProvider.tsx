import { PropsWithChildren, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { User } from '../types/user';
import {
  AuthContext,
  setOnboardingCompleted,
  type AuthContextValue,
  type AuthResult,
  type SignUpResult,
} from './AuthContext';

type AuthProviderProps = PropsWithChildren<{
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshProfile: AuthContextValue['refreshProfile'];
}>;

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const INVALID_LOGIN_ERROR = 'Email or password is incorrect.';
const EMAIL_EXISTS_ERROR = 'An account with this email already exists. Try signing in.';
const EMAIL_CONFIRM_ERROR = 'Please check your email to verify your account.';
const NOT_CONFIGURED_ERROR =
  "RIFAA isn't connected to a backend yet. Add your Supabase credentials to enable sign-in.";

// Email/password auth over the network resolves in a few milliseconds in the
// fallback client (and may fail instantly). Hold the loading state long enough
// for it to be perceivable and to swallow double-taps.
const MIN_SIGN_IN_VISIBLE_MS = 350;

function isNotConfiguredError(message: string): boolean {
  return !isSupabaseConfigured || message.includes('[supabase]') || /not configured/i.test(message);
}

function userFacingSignInError(error: { message: string; code?: string }): string {
  const message = error.message;
  const code = error.code ?? '';
  if (isNotConfiguredError(message)) {
    return NOT_CONFIGURED_ERROR;
  }
  if (/invalid_credentials|invalid login credentials|incorrect/i.test(`${code} ${message}`)) {
    return INVALID_LOGIN_ERROR;
  }
  if (/email not confirmed|email_not_confirmed|not confirmed/i.test(`${code} ${message}`)) {
    return EMAIL_CONFIRM_ERROR;
  }
  if (/(failed to fetch|network|timeout|econnaborted|socket|fetch failed)/i.test(message)) {
    return GENERIC_ERROR;
  }
  return INVALID_LOGIN_ERROR;
}

function userFacingSignUpError(error: { message: string; code?: string }): string {
  const message = error.message;
  const code = error.code ?? '';
  if (isNotConfiguredError(message)) {
    return NOT_CONFIGURED_ERROR;
  }
  if (/already exists|already registered|user already|duplicate/i.test(`${code} ${message}`)) {
    return EMAIL_EXISTS_ERROR;
  }
  if (/weak password|at least 8/i.test(`${code} ${message}`)) {
    return 'Password must be at least 8 characters.';
  }
  if (/(failed to fetch|network|timeout|econnaborted|socket|fetch failed)/i.test(message)) {
    return GENERIC_ERROR;
  }
  return GENERIC_ERROR;
}

export function AuthProvider({
  children,
  user,
  session,
  loading,
  refreshProfile,
}: AuthProviderProps) {
  const [signingIn, setSigningIn] = useState(false);

  const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    if (signingIn) {
      return { status: 'error', message: GENERIC_ERROR };
    }
    setSigningIn(true);
    const startedAt = Date.now();
    try {
      if (!isSupabaseConfigured) {
        return { status: 'error', message: NOT_CONFIGURED_ERROR };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { status: 'error', message: userFacingSignInError(error) };
      }

      return { status: 'success' };
    } finally {
      const remaining = MIN_SIGN_IN_VISIBLE_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setSigningIn(false);
    }
  };

  const signUpWithEmail = async (
    name: string,
    email: string,
    password: string,
  ): Promise<SignUpResult> => {
    if (signingIn) {
      return { status: 'error', message: GENERIC_ERROR };
    }
    setSigningIn(true);
    const startedAt = Date.now();
    try {
      if (!isSupabaseConfigured) {
        return { status: 'error', message: NOT_CONFIGURED_ERROR };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });

      if (error) {
        return { status: 'error', message: userFacingSignUpError(error) };
      }

      // If Supabase returned a session, the user is fully authenticated and the
      // route guard will route them onward. If only a user was returned, email
      // confirmation is required — do not pretend they are authenticated.
      return { status: 'success', needsEmailConfirmation: !data.session };
    } finally {
      const remaining = MIN_SIGN_IN_VISIBLE_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
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
      signInWithEmail,
      signUpWithEmail,
      signOut,
      completeOnboarding,
      refreshProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, session, loading, signingIn, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
