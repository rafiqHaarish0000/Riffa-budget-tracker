import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GlassButton, GlassCard, GlassInput } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, iconSizes, spacing } from '../../constants/theme';
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
    <ThemedScreen scroll keyboardShouldPersistTaps="handled">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to intro"
        disabled={signingIn}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={8}
        style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
      >
        <Ionicons name="chevron-back" size={iconSizes.sm} color={colors.accent} />
        <ThemedText variant="bodyMedium" color={colors.accent}>
          Back
        </ThemedText>
      </Pressable>

      <ThemedText variant="title" color={colors.text} style={styles.title}>
        Create your account
      </ThemedText>
      <ThemedText variant="body" color={colors.textSecondary} style={styles.supporting}>
        Start your shared money space.
      </ThemedText>

      <GlassCard style={styles.card}>
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
          title="Create account"
          loading={signingIn}
          loadingTitle="Creating account…"
          disabled={!canSubmit}
          onPress={handleSignUp}
        />
      </GlassCard>

      <Pressable
        accessibilityRole="button"
        disabled={signingIn}
        onPress={() => router.push('/sign-in')}
        style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
      >
        <ThemedText variant="bodyMedium" color={colors.accent}>
          Already have an account? Sign in
        </ThemedText>
      </Pressable>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
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
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  supporting: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.xl,
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
  secondary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPressed: {
    opacity: 0.6,
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
