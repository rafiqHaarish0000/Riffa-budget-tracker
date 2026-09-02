import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassScreenBackground } from '../components/ui/glass/GlassBackground';
import { GlassCard } from '../components/ui/glass';
import { ThemedText } from '../components/ui/ThemedText';
import { colors, glass, radius, shadows, spacing, theme } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { resolveAuthedRoute } from '../contexts/AuthContext';

const SPLASH_DURATION_MS = 1900;
const LOGO_SIZE = 120;

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loading, session, user } = useAuth();

  const [reduceMotion, setReduceMotion] = useState(false);
  const [readyToNavigate, setReadyToNavigate] = useState(false);

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.96)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const bottomOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const useNative = Platform.OS !== 'web';
    const eased = Easing.bezier(0.22, 1, 0.36, 1);

    if (reduceMotion) {
      bgOpacity.setValue(1);
      logoScale.setValue(1);
      logoOpacity.setValue(1);
      taglineOpacity.setValue(1);
      bottomOpacity.setValue(1);
      setReadyToNavigate(true);
      return;
    }

    Animated.sequence([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: useNative,
      }),
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 650,
          easing: eased,
          useNativeDriver: useNative,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          easing: eased,
          useNativeDriver: useNative,
        }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          easing: eased,
          useNativeDriver: useNative,
        }),
        Animated.timing(bottomOpacity, {
          toValue: 1,
          duration: 500,
          easing: eased,
          useNativeDriver: useNative,
        }),
      ]),
    ]).start(() => {
      setReadyToNavigate(true);
    });
  }, [reduceMotion, bgOpacity, logoScale, logoOpacity, taglineOpacity, bottomOpacity]);

  const mountedAt = useRef(Date.now()).current;

  useEffect(() => {
    if (!readyToNavigate || loading) {
      return;
    }
    // Guarantee the splash holds on screen for its full duration (unless the
    // user prefers reduced motion, where the animation is skipped entirely and
    // navigation happens right away).
    const elapsed = Date.now() - mountedAt;
    const delay = reduceMotion ? 0 : Math.max(0, SPLASH_DURATION_MS - elapsed);
    const id = setTimeout(() => {
      const route = resolveAuthedRoute(session, user) ?? '/(auth)/intro';
      router.replace(route);
    }, delay);
    return () => clearTimeout(id);
  }, [readyToNavigate, loading, session, user, router, reduceMotion, mountedAt]);

  return (
    <GlassScreenBackground>
      <Animated.View style={[styles.fill, { opacity: bgOpacity }]}>
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.hero}>
            <Animated.View
              style={{
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              }}
            >
              <SavingsEmblem />
            </Animated.View>

            <ThemedText variant="display" color={colors.text} style={styles.wordmark}>
              RIFAA
            </ThemedText>

            <Animated.View style={{ opacity: taglineOpacity }}>
              <ThemedText variant="subheading" color={colors.textSecondary} style={styles.tagline}>
                Money, together.
              </ThemedText>
            </Animated.View>
          </View>

          <Animated.View style={[styles.bottom, { opacity: bottomOpacity }]}>
            <ThemedText variant="caption" color={colors.textMuted} style={styles.bottomText}>
              Your shared money space
            </ThemedText>
          </Animated.View>
        </View>
      </Animated.View>
    </GlassScreenBackground>
  );
}

function SavingsEmblem() {
  return (
    <GlassCard
      tint="extraLight"
      intensity={glass.blur.heavy}
      style={styles.emblemCard}
      padding={0}
    >
      <View style={styles.emblem}>
        <View style={styles.emblemRing} />
        <View style={styles.emblemCore} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  root: {
    flex: 1,
    paddingHorizontal: theme.screenPadding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginTop: -spacing.massive,
  },
  emblemCard: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  emblem: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemRing: {
    position: 'absolute',
    width: LOGO_SIZE - 28,
    height: LOGO_SIZE - 28,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.accent,
    opacity: 0.35,
  },
  emblemCore: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.accentStrong,
  },
  wordmark: {
    marginTop: spacing.xxxl,
    letterSpacing: 6,
  } as TextStyle,
  tagline: {
    marginTop: spacing.md,
  },
  bottom: {
    position: 'absolute',
    bottom: spacing.xxxl,
    alignItems: 'center',
  },
  bottomText: {
    letterSpacing: 0.4,
  },
});
