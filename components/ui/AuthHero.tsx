import { Ionicons } from '@expo/vector-icons';
import { SpaceGrotesk_700Bold, useFonts } from '@expo-google-fonts/space-grotesk';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { AuthAtmosphere } from './AuthAtmosphere';
import { ThemedText } from './ThemedText';
import { colors, radius, spacing } from '../../constants/theme';

const authHeroFonts = { SpaceGrotesk_700Bold };

const TAGLINES = ['Together.', 'Save more.', 'Spend smart.', 'Grow shared.'];

type AuthHeroProps = {
  eyebrow: string;
  title: string;
  accent: string;
  supporting: string;
  progress?: { active: number; total: number };
  atmosphere?: boolean;
  interactive?: boolean;
};

export function AuthHero({
  eyebrow,
  title,
  accent,
  supporting,
  progress,
  atmosphere = false,
  interactive = true,
}: AuthHeroProps) {
  const [fontsLoaded] = useFonts(authHeroFonts);
  const [taglineIndex, setTaglineIndex] = useState(0);

  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(-1)).current;
  const bump = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  function handlePress() {
    setTaglineIndex((i) => (i + 1) % TAGLINES.length);
    Animated.timing(bump, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: true,
    }).start(() => bump.setValue(0));

    shine.setValue(-1);
    Animated.timing(shine, {
      toValue: 1,
      duration: 760,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => shine.setValue(-1));
  }

  const scale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const bumpScale = bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const shineTranslate = shine.interpolate({ inputRange: [-1, 1], outputRange: [-140, 220] });

  return (
    <View style={styles.wrap}>
      {atmosphere ? <AuthAtmosphere /> : null}

      <Animated.View
        style={[
          styles.brandShowcase,
          { opacity: entrance, transform: [{ scale }, { scale: bumpScale }] },
        ]}
      >
        {fontsLoaded ? (
          <ThemedText pointerEvents="none" style={styles.watermark}>
            RIFFA
          </ThemedText>
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[styles.glow, { opacity: glowOpacity }]}
        />

        {interactive ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="RIFFA, tap to explore"
            onPress={handlePress}
            style={({ pressed }) => [
              styles.logoFrame,
              pressed && styles.logoFramePressed,
            ]}
          >
            <View style={styles.openInner}>
              <ThemedText style={styles.wordmark}>
                <ThemedText style={styles.wordmarkPart}>RI</ThemedText>
                <ThemedText style={styles.wordmarkAccent}>F</ThemedText>
                <ThemedText style={styles.wordmarkPart}>FA</ThemedText>
              </ThemedText>
              <Animated.View
                pointerEvents="none"
                style={[styles.shine, { transform: [{ translateX: shineTranslate }] }]}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shineBar}
                />
              </Animated.View>
            </View>
            <View style={styles.tapHint}>
              <Ionicons name="sparkles" size={12} color={colors.accent} />
              <ThemedText variant="labelRegular" color={colors.textMuted}>
                {TAGLINES[taglineIndex]}
              </ThemedText>
            </View>
          </Pressable>
        ) : (
          <View style={styles.logoFrame}>
            <ThemedText style={styles.wordmark}>
              <ThemedText style={styles.wordmarkPart}>RI</ThemedText>
              <ThemedText style={styles.wordmarkAccent}>F</ThemedText>
              <ThemedText style={styles.wordmarkPart}>FA</ThemedText>
            </ThemedText>
          </View>
        )}
      </Animated.View>

      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowDot} />
        <ThemedText variant="label" color={colors.accentStrong}>{eyebrow}</ThemedText>
      </View>

      <ThemedText variant="display" color={colors.text} style={styles.title}>
        {title}
        <ThemedText variant="display" color={colors.accent}>{accent}</ThemedText>
      </ThemedText>

      <ThemedText variant="body" color={colors.textSecondary} style={styles.supporting}>
        {supporting}
      </ThemedText>

      {progress ? (
        <View style={styles.progressRow}>
          {Array.from({ length: progress.total }).map((_, i) => (
            <View
              key={i}
              style={[styles.progressSegment, i < progress.active ? styles.progressActive : styles.progressRest]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    paddingTop: spacing.xl,
  },
  brandShowcase: {
    width: 220,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  watermark: {
    position: 'absolute',
    fontSize: 34,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 9,
    color: 'rgba(85, 214, 177, 0.09)',
  },
  glow: {
    position: 'absolute',
    width: 190,
    height: 130,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(85, 214, 177, 0.18)',
  },
  logoFrame: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoFramePressed: {
    opacity: 0.9,
  },
  openInner: {
    position: 'relative',
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
  },
  shineBar: {
    flex: 1,
    width: 60,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  wordmark: {
    fontSize: 40,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 2,
    color: colors.text,
  },
  wordmarkPart: {
    fontSize: 40,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.text,
  },
  wordmarkAccent: {
    fontSize: 40,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.accent,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  title: {
    letterSpacing: -0.8,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  supporting: {
    maxWidth: 320,
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    width: 132,
    marginTop: spacing.xl,
  },
  progressSegment: {
    height: 4,
    flex: 1,
    borderRadius: radius.pill,
  },
  progressActive: {
    backgroundColor: colors.accent,
  },
  progressRest: {
    backgroundColor: colors.surfaceStrong,
  },
});
