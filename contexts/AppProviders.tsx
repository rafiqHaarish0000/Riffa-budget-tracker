import { useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../types/user';
import { AuthProvider } from './AuthProvider';

export function AppProviders({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  // Restore the persisted session on launch and keep it in sync with Supabase.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Ignore events that leave the session identical (e.g. periodic token
      // refreshes with unchanged access tokens) so we never flash an auth
      // loading screen or reload the profile unnecessarily.
      setSession((current) => {
        if (!nextSession && !current) {
          return current ?? null;
        }
        if (
          nextSession &&
          current &&
          nextSession.access_token === current.access_token
        ) {
          return current;
        }
        return nextSession;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load the RIFAA user profile whenever the session changes (login / logout /
  // token refresh). A missing profile row means this is a brand-new user.
  useEffect(() => {
    let active = true;
    setUser(null);
    setProfileReady(false);

    async function load() {
      if (!session) {
        if (active) setProfileReady(true);
        return;
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        if (active) setProfileReady(true);
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (active) {
        setUser(data ?? null);
        setProfileReady(true);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [session]);

  // Re-fetch the profile on demand (e.g. after family create/join updates the
  // `users` row). Unlike the session effect above, this does not flip
  // `profileReady`, so it never flashes the auth loading screen.
  const reloadProfile = useCallback(async (): Promise<User | null> => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      setUser(null);
      return null;
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    setUser(data ?? null);
    return data ?? null;
  }, []);

  const refreshProfile = useCallback(async (): Promise<User | null> => {
    return reloadProfile();
  }, [reloadProfile]);

  // Block routing until the persisted session has been restored AND the initial
  // profile lookup has resolved, so route guards never misdirect (e.g. showing
  // a "new user" onboarding flash to an existing user whose profile is loading).
  const loading = !sessionReady || !profileReady;

  return (
    <AuthProvider
      user={user}
      session={session}
      loading={loading}
      refreshProfile={refreshProfile}
    >
      {children}
    </AuthProvider>
  );
}
