import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, glass, iconSizes, radius, shadows, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { GlassButton, GlassCard, GlassInput } from '../ui/glass';
import { ThemedScreen } from '../ui/ThemedScreen';
import { ThemedText } from '../ui/ThemedText';

export type OnboardingMode = 'choice' | 'create' | 'join';

const MARK_SIZE = 64;

// Family create/join resolves in a few milliseconds in fallback mode (and may
// error instantly). Hold the loading state long enough for it to be perceivable
// and to swallow double taps, mirroring the sign-in flow.
const MIN_SUBMIT_VISIBLE_MS = 350;

const NETWORK_ERROR =
  "We couldn't reach the server. Please check your connection and try again.";
const CREATE_ERROR = "We couldn't create your family. Please try again.";
const JOIN_ERROR = "That family code wasn't found. Please check it and try again.";
const ALREADY_ERROR = "You're already part of a family.";
const CONFIRM_ERROR = "We couldn't confirm your family. Please try again.";
const CONFIG_ERROR =
  "RIFAA isn't connected to a backend yet. Add your Supabase credentials to set up your family.";

function userFacingError(error: Error | null, kind: 'create' | 'join'): string {
  if (!error) {
    return '';
  }
  const message = error.message;
  if (!isSupabaseConfigured || message.includes('[supabase]') || /not configured/i.test(message)) {
    return CONFIG_ERROR;
  }
  if (/\balready\b/i.test(message) && /\bfamily\b/i.test(message)) {
    return ALREADY_ERROR;
  }
  if (/(failed to fetch|network|timeout|econnaborted|socket)/i.test(message)) {
    return NETWORK_ERROR;
  }
  return kind === 'join' ? JOIN_ERROR : CREATE_ERROR;
}

type FamilyOnboardingScreenProps = {
  initialMode?: OnboardingMode;
};

/**
 * The Create / Join Family onboarding screen. After authenticating, a new RIFAA
 * user either creates a shared family space or joins one with a family code.
 * Created/joined family state is persisted entirely through Supabase; this
 * screen never invents family IDs or fake memberships.
 */
export function FamilyOnboardingScreen({
  initialMode = 'choice',
}: FamilyOnboardingScreenProps) {
  const { user, refreshProfile } = useAuth();
  const { createFamily, joinFamily } = useFamily(user);

  const [mode, setMode] = useState<OnboardingMode>(initialMode);
  const [familyName, setFamilyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goTo(next: OnboardingMode) {
    setError(null);
    setMode(next);
  }

  async function handleCreate() {
    if (submitting) {
      return;
    }
    const name = familyName.trim();
    if (!name) {
      setError('Please enter a family name.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const startedAt = Date.now();

    const { error: createError } = await createFamily(name);

    const remaining = MIN_SUBMIT_VISIBLE_MS - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    if (createError) {
      setSubmitting(false);
      setError(userFacingError(createError, 'create'));
      return;
    }

    // Best-effort: set the display name on the real authenticated user's row if
    // provided. Never fabricates a user or profile.
    const requestedName = displayName.trim();
    if (requestedName && user) {
      await supabase
        .from('users')
        .update({ name: requestedName })
        .eq('id', user.id);
    }

    const refreshed = await refreshProfile();
    setSubmitting(false);

    if (!refreshed?.family_id) {
      setError(CONFIRM_ERROR);
      return;
    }
    router.replace('/(tabs)/home');
  }

  async function handleJoin() {
    if (submitting) {
      return;
    }
    const code = familyCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter your family code.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const startedAt = Date.now();

    const { error: joinError } = await joinFamily(code);

    const remaining = MIN_SUBMIT_VISIBLE_MS - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    if (joinError) {
      setSubmitting(false);
      setError(userFacingError(joinError, 'join'));
      return;
    }

    const refreshed = await refreshProfile();
    setSubmitting(false);

    if (!refreshed?.family_id) {
      setError(CONFIRM_ERROR);
      return;
    }
    router.replace('/(tabs)/home');
  }

  if (mode === 'create') {
    return (
      <ThemedScreen scroll>
        <BackRow disabled={submitting} onPress={() => goTo('choice')} />
        <ThemedText variant="title" color={colors.text} style={styles.formTitle}>
          Create your family
        </ThemedText>
        <ThemedText variant="body" color={colors.textSecondary} style={styles.formSupporting}>
          Give your shared money space a name.
        </ThemedText>

        <GlassCard style={styles.card}>
          <GlassInput
            label="Family name"
            icon={<Ionicons name="home-outline" size={iconSizes.md} color={colors.accent} />}
            placeholder="e.g. Our family"
            placeholderTextColor={colors.textMuted}
            value={familyName}
            onChangeText={setFamilyName}
            editable={!submitting}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            accessibilityLabel="Family name"
          />
          <GlassInput
            label="Your display name (optional)"
            icon={<Ionicons name="person-outline" size={iconSizes.md} color={colors.accent} />}
            placeholder="e.g. Mohammed"
            placeholderTextColor={colors.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
            editable={!submitting}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Your display name"
          />

          {error ? (
            <ThemedText variant="caption" color={colors.danger} style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <GlassButton
            title="Create family"
            loading={submitting}
            loadingTitle="Creating…"
            onPress={handleCreate}
          />
        </GlassCard>
      </ThemedScreen>
    );
  }

  if (mode === 'join') {
    return (
      <ThemedScreen scroll>
        <BackRow disabled={submitting} onPress={() => goTo('choice')} />
        <ThemedText variant="title" color={colors.text} style={styles.formTitle}>
          Join a family
        </ThemedText>
        <ThemedText variant="body" color={colors.textSecondary} style={styles.formSupporting}>
          Enter the code someone in your family shared with you.
        </ThemedText>

        <GlassCard style={styles.card}>
          <GlassInput
            label="Family code"
            icon={<Ionicons name="key-outline" size={iconSizes.md} color={colors.accent} />}
            placeholder="e.g. RIFAA7X"
            placeholderTextColor={colors.textMuted}
            value={familyCode}
            onChangeText={setFamilyCode}
            editable={!submitting}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            returnKeyType="done"
            accessibilityLabel="Family code"
          />

          {error ? (
            <ThemedText variant="caption" color={colors.danger} style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <GlassButton
            title="Join family"
            loading={submitting}
            loadingTitle="Joining…"
            onPress={handleJoin}
          />
        </GlassCard>
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen scroll>
      <View style={styles.topBar}>
        <ThemedText variant="captionBold" color={colors.accentStrong} style={styles.eyebrow}>
          RIFAA
        </ThemedText>
      </View>

      <View style={styles.mark}>
        <FamilyMark />
      </View>

      <ThemedText variant="display" color={colors.text} style={styles.title}>
        Your money space, together.
      </ThemedText>
      <ThemedText variant="body" color={colors.textSecondary} style={styles.supporting}>
        Create a family space for shared expenses, savings, and planning — or join
        one you've already started.
      </ThemedText>

      <View style={styles.actions}>
        <GlassButton title="Create a family" onPress={() => goTo('create')} />
        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => goTo('join')}
          style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
        >
          <ThemedText variant="bodyMedium" color={colors.accent}>
            Join a family
          </ThemedText>
        </Pressable>
      </View>
    </ThemedScreen>
  );
}

function BackRow({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to choose create or join"
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
    >
      <Ionicons name="chevron-back" size={iconSizes.sm} color={colors.accent} />
      <ThemedText variant="bodyMedium" color={colors.accent}>
        Back
      </ThemedText>
    </Pressable>
  );
}

/** Minimal glass mark: two people around a small shared coin. */
function FamilyMark() {
  return (
    <View style={markStyles.container}>
      <GlassCard tint="extraLight" intensity={glass.blur.medium} padding={0} style={markStyles.orb}>
        <View style={markStyles.orbInner}>
          <View style={markStyles.head} />
          <ThemedText variant="label" color={colors.accentStrong}>
            1
          </ThemedText>
        </View>
      </GlassCard>
      <GlassCard tint="extraLight" intensity={glass.blur.heavy} padding={0} style={markStyles.coin}>
        <View style={markStyles.coinRing} />
        <View style={markStyles.coinDot} />
      </GlassCard>
      <GlassCard tint="extraLight" intensity={glass.blur.medium} padding={0} style={markStyles.orb}>
        <View style={markStyles.orbInner}>
          <View style={markStyles.head} />
          <ThemedText variant="label" color={colors.accentStrong}>
            2
          </ThemedText>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  eyebrow: {
    letterSpacing: 4,
  },
  mark: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  supporting: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  secondary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  secondaryPressed: {
    opacity: 0.6,
  },
  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: spacing.xl,
  },
  backPressed: {
    opacity: 0.6,
  },
  formTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  formSupporting: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.xl,
  },
  error: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});

const markStyles = StyleSheet.create({
  container: {
    height: 150,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  orbInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.xs,
  },
  coin: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    marginHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
    ...shadows.float,
  },
  coinRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.accent,
    opacity: 0.4,
  },
  coinDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.accentStrong,
  },
});