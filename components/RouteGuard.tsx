import { Redirect, usePathname, type Href } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { resolveAuthedRoute } from '../contexts/AuthContext';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { GlassScreenBackground } from './ui/glass/GlassBackground';
import { ThemedText } from './ui/ThemedText';

/**
 * Simple full-screen loader shown while the persisted session / profile is
 * being restored. Prevents a flash of the wrong screen on cold start or after
 * a token refresh / sign-in.
 */
export function AuthLoading() {
  return (
    <GlassScreenBackground>
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
        <ThemedText variant="captionBold" color={colors.accentStrong} style={styles.loadingText}>
          RIFAA
        </ThemedText>
      </View>
    </GlassScreenBackground>
  );
}

/**
 * Route guard for signed-in screens. Renders children only once a session is
 * present; otherwise redirects unauthenticated users to the intro.
 */
export function RequireAuth({ children }: PropsWithChildren) {
  const { loading, session } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }
  if (!session) {
    return <Redirect href="/(auth)/intro" />;
  }
  return <>{children}</>;
}

/**
 * Normalize an expo-router href (which may include a route group segment like
 * `/(auth)/create-family`) to the pathname form `usePathname()` returns
 * (`/create-family`), so the two can be compared.
 */
function normalizeHref(href: string): string {
  return href.replace(/^\/\(\w+\)/, '');
}

/**
 * Route guard for the unauthenticated (auth) group. Used so that a signed-in
 * user who lands on intro/onboarding is routed to their correct destination
 * (home for existing users, onboarding for new users).
 */
export function GuestOnly({ children }: PropsWithChildren) {
  const { loading, session, user } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <AuthLoading />;
  }
  if (session) {
    const href = resolveAuthedRoute(session, user);
    // Avoid redirecting to the exact onboarding screen the user is already on
    // (resolveAuthedRoute points new users at create-family) — that would loop
    // or remount the screen. Existing users with a family still get sent Home.
    if (href && normalizeHref(href) !== pathname) {
      return <Redirect href={href as Href} />;
    }
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.lg,
    letterSpacing: 4,
  },
});
