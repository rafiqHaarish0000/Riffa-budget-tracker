import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { GlassButton, GlassCard, GlassInput } from '../../components/ui/glass';
import { AuthHero } from '../../components/ui/AuthHero';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const { signingIn, signInWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

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
    <ThemedScreen scroll keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
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
      </View>

      <Animated.View style={[styles.enter, { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
        <AuthHero
          atmosphere
          eyebrow="YOUR PRIVATE SPACE"
          title="Welcome "
          accent="back."
          supporting="Sign in to see what your money has been doing."
        />

        <GlassCard style={styles.card}>
          <View style={styles.cardAccent} />
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="lock-closed" size={iconSizes.sm} color={colors.accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText variant="captionBold" color={colors.text}>Sign in securely</ThemedText>
              <ThemedText variant="labelRegular" color={colors.textMuted}>Your family stays protected</ThemedText>
            </View>
          </View>
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
          title="Continue securely"
          leading={<Ionicons name="lock-closed-outline" size={iconSizes.md} color={colors.textInverse} />}
          trailing={<Ionicons name="arrow-forward" size={iconSizes.md} color={colors.textInverse} />}
          loading={signingIn}
          loadingTitle="Signing in…"
          disabled={!canSubmit}
          onPress={handleSignIn}
          style={styles.submit}
        />
        </GlassCard>

        <Pressable
          accessibilityRole="button"
          disabled={signingIn}
          onPress={() => router.push('/sign-up')}
          style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
        >
          <ThemedText variant="caption" color={colors.textMuted}>New to RIFAA?</ThemedText>
          <ThemedText variant="bodyMedium" color={colors.accentStrong}>Create an account</ThemedText>
        </Pressable>

        <View style={styles.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={iconSizes.sm} color={colors.accent} />
          <ThemedText variant="caption" color={colors.textMuted}>Bank-grade security</ThemedText>
          <View style={styles.trustDot} />
          <ThemedText variant="caption" color={colors.textMuted}>Encrypted end to end</ThemedText>
        </View>
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
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: spacing.lg,
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
    justifyContent: 'center',
    alignItems: 'center',
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
  trustRow: {
    marginTop: 'auto',
    paddingTop: spacing.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginHorizontal: spacing.xs,
  },
});
