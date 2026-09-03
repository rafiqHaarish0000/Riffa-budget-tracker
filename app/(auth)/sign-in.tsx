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

export default function SignInScreen() {
  const { signingIn, signInWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedEmail = email.trim();
  const emailEmpty = trimmedEmail.length === 0;
  const emailInvalid = !emailEmpty && !EMAIL_REGEX.test(trimmedEmail);
  const showEmailError = touched && (emailEmpty || emailInvalid);
  const showPasswordError = touched && password.length === 0;

  const canSubmit =
    !signingIn && !emailEmpty && !emailInvalid && password.length > 0;

  async function handleSignIn() {
    if (signingIn || !canSubmit) {
      return;
    }
    setError(null);
    const result = await signInWithEmail(trimmedEmail, password);
    if (result.status === 'error') {
      setError(result.message);
      setTouched(true);
    }
    // On success, the (auth) route guard picks up the new session and routes
    // the user to Home (existing family) or Create/Join Family (new user).
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
        Welcome back
      </ThemedText>
      <ThemedText variant="body" color={colors.textSecondary} style={styles.supporting}>
        Sign in to your shared money space.
      </ThemedText>

      <GlassCard style={styles.card}>
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
          placeholder="Your password"
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
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          accessibilityLabel="Password"
        />
        {showPasswordError ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.fieldError}>
            Please enter your password.
          </ThemedText>
        ) : null}

        {error ? (
          <ThemedText variant="caption" color={colors.danger} style={styles.formError}>
            {error}
          </ThemedText>
        ) : null}

        <GlassButton
          title="Sign In"
          loading={signingIn}
          loadingTitle="Signing in…"
          disabled={!canSubmit}
          onPress={handleSignIn}
        />
      </GlassCard>

      <Pressable
        accessibilityRole="button"
        disabled={signingIn}
        onPress={() => router.push('/sign-up')}
        style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
      >
        <ThemedText variant="bodyMedium" color={colors.accent}>
          Create account
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
    opacity: 0.7,
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
    opacity: 0.7,
  },
});
