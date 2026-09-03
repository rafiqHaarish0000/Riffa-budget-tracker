import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassScreenBackground } from '../components/ui/glass/GlassBackground';
import { AuthAtmosphere } from '../components/ui/AuthAtmosphere';
import { ThemedText } from '../components/ui/ThemedText';
import { colors, radius, spacing, theme } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { resolveAuthedRoute } from '../contexts/AuthContext';

const SPLASH_DURATION_MS = 3600;
const LOGO_SIZE = 172;

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
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.82)).current;
  const ringRotation = useRef(new Animated.Value(-28)).current;

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
      haloOpacity.setValue(0.28);
      haloScale.setValue(1);
      ringRotation.setValue(0);
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
        Animated.timing(haloOpacity, {
          toValue: 0.28,
          duration: 620,
          easing: eased,
          useNativeDriver: useNative,
        }),
        Animated.timing(haloScale, {
          toValue: 1,
          duration: 700,
          easing: eased,
          useNativeDriver: useNative,
        }),
        Animated.timing(ringRotation, {
          toValue: 0,
          duration: 760,
          easing: eased,
          useNativeDriver: useNative,
        }),
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
  }, [reduceMotion, bgOpacity, logoScale, logoOpacity, taglineOpacity, bottomOpacity, haloOpacity, haloScale, ringRotation]);

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
    let exitAnimation: Animated.CompositeAnimation | null = null;
    const id = setTimeout(() => {
      const route = resolveAuthedRoute(session, user) ?? '/(auth)/intro';
      if (reduceMotion) {
        router.replace(route);
        return;
      }
      exitAnimation = Animated.timing(bgOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      });
      exitAnimation.start(({ finished }) => {
        if (finished) router.replace(route);
      });
    }, delay);
    return () => {
      clearTimeout(id);
      exitAnimation?.stop();
    };
  }, [readyToNavigate, loading, session, user, router, reduceMotion, mountedAt, bgOpacity]);

  return (
    <GlassScreenBackground>
      <AuthAtmosphere />
      <Animated.View style={[styles.fill, { opacity: bgOpacity }]}> 
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
          <Animated.View style={[styles.topNote, { opacity: taglineOpacity }]}> 
            <View style={styles.liveDot} />
            <ThemedText variant="label" color={colors.accentStrong}>YOUR FAMILY FINANCE SPACE</ThemedText>
          </Animated.View>
          <View style={styles.hero}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.halo,
                {
                  opacity: haloOpacity,
                  transform: [{ scale: haloScale }, { rotate: ringRotation.interpolate({ inputRange: [-28, 0], outputRange: ['-28deg', '0deg'] }) }],
                },
              ]}
            />
            <Animated.View style={[styles.logoFrame, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
              <Image source={require('../assets/riffa-logo-header.png')} style={styles.logo} resizeMode="contain" />
            </Animated.View>

            <ThemedText variant="display" color={colors.text} style={styles.wordmark}>
              RIFFA
            </ThemedText>

            <Animated.View style={{ opacity: taglineOpacity }}>
              <ThemedText variant="subheading" color={colors.textSecondary} style={styles.tagline}>
                Money, together.
              </ThemedText>
            </Animated.View>
          </View>

          <Animated.View style={[styles.bottom, { opacity: bottomOpacity }]}> 
            <ThemedText variant="caption" color={colors.textMuted} style={styles.bottomText}>
              SHARED MONEY, TOGETHER
            </ThemedText>
            <View style={styles.loadingTrack}>
              <View style={styles.loadingFill} />
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </GlassScreenBackground>
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
  topNote: {
    position: 'absolute',
    top: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  halo: {
    position: 'absolute',
    width: LOGO_SIZE + 48,
    height: LOGO_SIZE + 48,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  logoFrame: {
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: radius.sm,
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
  loadingTrack: {
    width: 92,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceStrong,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  loadingFill: {
    width: '68%',
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
