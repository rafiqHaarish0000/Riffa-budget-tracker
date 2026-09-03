import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { GlassButton, GlassCard, GlassInput } from '../../components/ui/glass';
import { AuthAtmosphere } from '../../components/ui/AuthAtmosphere';
import { AuthHero } from '../../components/ui/AuthHero';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export default function SignUpScreen() {
  const { signingIn, signUpWithEmail } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const nameEmpty = trimmedName.length === 0;
  const emailEmpty = trimmedEmail.length === 0;
  const emailInvalid = !emailEmpty && !EMAIL_REGEX.test(trimmedEmail);
  const passwordShort = password.length < MIN_PASSWORD_LENGTH;
  const confirmMismatch = confirm.length > 0 && confirm !== password;

  const showNameError = touched && nameEmpty;
  const showEmailError = touched && (emailEmpty || emailInvalid);
  const showPasswordError = touched && (password.length === 0 || passwordShort);
  const showConfirmError = touched && (confirm.length === 0 || confirmMismatch);

  const canSubmit =
    !signingIn &&
    !nameEmpty &&
    !emailEmpty &&
    !emailInvalid &&
    password.length > 0 &&
    !passwordShort &&
    confirm.length > 0 &&
    !confirmMismatch;

  async function handleSignUp() {
    if (signingIn || !canSubmit) {
      return;
    }
    setError(null);
    const result = await signUpWithEmail(trimmedName, trimmedEmail, password);
    if (result.status === 'error') {
      setError(result.message);
      setTouched(true);
      return;
    }
    if (result.needsEmailConfirmation) {
      // Supabase created the user but did not return a session (email
      // confirmation is enabled). Do NOT pretend the user is authenticated or
      // navigate to Home. Show a clear confirmation state instead.
      setConfirmationPending(true);
      return;
    }
    // Session returned: the (auth) route guard routes the new user to
    // Create/Join Family.
  }

  if (confirmationPending) {
    return (
      <ThemedScreen scroll>
        <AuthAtmosphere />
        <ThemedText variant="title" color={colors.text} style={styles.title}>
          Check your email
        </ThemedText>
        <ThemedText variant="body" color={colors.textSecondary} style={styles.supporting}>
          Account created. Please check your email to verify your account.
        </ThemedText>

        <GlassCard style={styles.card}>
          <View style={styles.confirmMark}>
            <Ionicons name="mail-open-outline" size={iconSizes.xl} color={colors.accentStrong} />
          </View>
          <ThemedText variant="caption" color={colors.textSecondary} style={styles.confirmText}>
            Once you&apos;ve verified your email, come back and sign in to get
            started.
          </ThemedText>
          <GlassButton
            title="Go to Sign In"
            variant="secondary"
            onPress={() => router.push('/sign-in')}
          />
        </GlassCard>
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen scroll keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <AuthAtmosphere />
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to intro"
          disabled={signingIn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Ionicons name="chevron-back" size={iconSizes.md} color={colors.text} />
        </Pressable>
        <ThemedText variant="captionBold" color={colors.textMuted}>STEP 1 OF 2</ThemedText>
      </View>

      <Animated.View style={[styles.enter, { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
        <AuthHero
          atmosphere
          eyebrow="START WITH RIFFA"
          title="Create your "
          accent="account."
          supporting="Set up your private money space. Your family comes next."
          progress={{ active: 1, total: 2 }}
        />

        <GlassCard style={styles.card}>
          <View style={styles.cardAccent} />
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="person-add" size={iconSizes.sm} color={colors.accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText variant="captionBold" color={colors.text}>Your details</ThemedText>
              <ThemedText variant="labelRegular" color={colors.textMuted}>It takes less than a minute</ThemedText>
            </View>
          </View>
        <GlassInput
          label="Name"
          icon={<Ionicons name="person-outline" size={iconSizes.md} color={colors.accent} />}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setTouched(true);
            setError(null);
          }}
          editable={!signingIn}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          accessibilityLabel="Name"
        />
        {showNameError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            Please enter your name.
          </ThemedText>
        ) : null}

        <GlassInput
          label="Email"
          icon={<Ionicons name="mail-outline" size={iconSizes.md} color={colors.accent} />}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setTouched(true);
            setError(null);
          }}
          editable={!signingIn}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          accessibilityLabel="Email"
        />
        {showEmailError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            {emailEmpty ? 'Please enter your email.' : 'Please enter a valid email address.'}
          </ThemedText>
        ) : null}

        <GlassInput
          label="Password"
          icon={<Ionicons name="lock-closed-outline" size={iconSizes.md} color={colors.accent} />}
          placeholder="At least 8 characters"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setTouched(true);
            setError(null);
          }}
          editable={!signingIn}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          accessibilityLabel="Password"
        />
        {showPasswordError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            {password.length === 0
              ? 'Please enter a password.'
              : 'Password must be at least 8 characters.'}
          </ThemedText>
        ) : null}

        <GlassInput
          label="Confirm password"
          icon={<Ionicons name="lock-closed-outline" size={iconSizes.md} color={colors.accent} />}
          placeholder="Re-enter your password"
          placeholderTextColor={colors.textMuted}
          value={confirm}
          onChangeText={(v) => {
            setConfirm(v);
            setTouched(true);
            setError(null);
          }}
          editable={!signingIn}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          accessibilityLabel="Confirm password"
        />
        {showConfirmError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            {confirm.length === 0 ? 'Please confirm your password.' : 'Passwords do not match.'}
          </ThemedText>
        ) : null}

        {error ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.formError}>
            {error}
          </ThemedText>
        ) : null}

        <GlassButton
          title="Create my RIFFA account"
          leading={<Ionicons name="sparkles" size={iconSizes.md} color={colors.textInverse} />}
          trailing={<Ionicons name="arrow-forward" size={iconSizes.md} color={colors.textInverse} />}
          loading={signingIn}
          loadingTitle="Creating account…"
          disabled={!canSubmit}
          onPress={handleSignUp}
          style={styles.submit}
        />
        </GlassCard>

        <Pressable
          accessibilityRole="button"
          disabled={signingIn}
          onPress={() => router.push('/sign-in')}
          style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
        >
          <ThemedText variant="caption" color={colors.textMuted}>Already part of RIFFA?</ThemedText>
          <ThemedText variant="bodyMedium" color={colors.accentStrong}>Sign in instead</ThemedText>
        </Pressable>
      </Animated.View>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  backPressed: {
    opacity: 0.7,
  },
  enter: {
    flex: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: -0.5,
  },
  supporting: {
    textAlign: 'center',
    maxWidth: 310,
  },
  card: {
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(85, 214, 177, 0.5)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  fieldError: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
  },
  formError: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  submit: {
    marginTop: spacing.xs,
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    minHeight: 56,
    borderRadius: radius.lg,
  },
  secondary: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  secondaryPressed: {
    opacity: 0.7,
  },
  confirmMark: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  confirmText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
});
