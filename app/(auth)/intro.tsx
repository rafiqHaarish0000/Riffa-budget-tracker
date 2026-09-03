import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { AuthAtmosphere } from '../../components/ui/AuthAtmosphere';
import { GlassButton, GlassCard } from '../../components/ui/glass';
import { ThemedScreen } from '../../components/ui/ThemedScreen';
import { ThemedText } from '../../components/ui/ThemedText';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';

export const introBrandFonts = {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
};

const HERO_IMAGE_URI =
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=85';

const SLIDES = [
  {
    image: HERO_IMAGE_URI, label: 'SHARED BALANCE', amount: '₹ 48,240', period: 'This month', change: '+12.8%',
    titleA: 'Your money.',
    titleB: 'Your rhythm, ', titleAccent: 'RIFAA.',
    description: 'RIFFA is your clear, calm space to spend smarter, save with purpose, and move forward together.',
    primary: ['RIFFA SPENDING', 'In control'], secondary: ['RIFFA SAVINGS', 'On track'],
    tint: ['#174239', '#0B201B'],
  },
  {
    image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=85', label: 'MONTHLY SAVINGS', amount: '₹ 18,600', period: 'On track', change: '+8.4%',
    titleA: 'Small steps.',
    titleB: 'Real ', titleAccent: 'progress.',
    description: 'Turn your family’s goals into a plan everyone can see, understand, and build together.',
    primary: ['GOALS', 'Moving forward'], secondary: ['SAVINGS', '₹ 18,600 set aside'],
    tint: ['#1B4A3B', '#0B201B'],
  },
  {
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=85', label: 'FAMILY SPENDING', amount: '₹ 26,480', period: 'In control', change: '-6.2%',
    titleA: 'Together,',
    titleB: 'perfectly ', titleAccent: 'in sync.',
    description: 'See the full picture without the back and forth, so every shared decision feels simple.',
    primary: ['FAMILY', 'Always in sync'], secondary: ['SPENDING', '6.2% lower'],
    tint: ['#22493E', '#0B201B'],
  },
];

export default function IntroScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts(introBrandFonts);
  const [slideIndex, setSlideIndex] = useState(0);
  const activeSlide = SLIDES[slideIndex];
  const slideOpacity = useRef(new Animated.Value(1)).current;
  const slideTranslate = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(1)).current;

  const transitionTo = useCallback((nextIndex: number) => {
    if (nextIndex === slideIndex) return;
    Animated.parallel([
      Animated.timing(slideOpacity, { toValue: 0, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideTranslate, { toValue: -12, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(titleScale, { toValue: 0.96, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setSlideIndex(nextIndex);
      slideTranslate.setValue(12);
      titleScale.setValue(1.02);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slideTranslate, { toValue: 0, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(titleScale, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  }, [slideIndex, slideOpacity, slideTranslate, titleScale]);

  useEffect(() => {
    const timer = setInterval(() => {
      transitionTo((slideIndex + 1) % SLIDES.length);
    }, 4600);
    return () => clearInterval(timer);
  }, [slideIndex, transitionTo]);

  const { titleA, titleB, titleAccent } = activeSlide;

  return (
    <ThemedScreen scroll contentContainerStyle={styles.content}>
      <AuthAtmosphere />

      <View style={styles.topBar}>
        <View style={styles.logoChip}>
          <Image source={require('../../assets/riffa-logo-header.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.securePill}>
          <View style={styles.secureDot} />
          <ThemedText variant="labelRegular" color={colors.textMuted}>ENCRYPTED</ThemedText>
        </View>
      </View>

      <View style={styles.illustration}>
        <View style={styles.heroGlow} />
        <Animated.View style={[styles.previewMotion, { opacity: slideOpacity, transform: [{ translateY: slideTranslate }] }]}>
          <FinancePreview slide={activeSlide} fontsLoaded={fontsLoaded} />
        </Animated.View>
      </View>

      <Animated.View
        style={{
          opacity: slideOpacity,
          transform: [{ translateY: slideTranslate }, { scale: titleScale }],
        }}
      >
        <ThemedText variant="display" color={colors.text} style={styles.title}>
          {titleA}
          {'\n'}
          {titleB}
          <ThemedText variant="display" color={colors.accent}>{titleAccent}</ThemedText>
        </ThemedText>
        <ThemedText variant="body" color={colors.textSecondary} style={styles.supporting}>
          {activeSlide.description}
        </ThemedText>

        <View style={styles.proofRow}>
          <Proof icon="pie-chart-outline" label={activeSlide.primary[0]} value={activeSlide.primary[1]} />
          <View style={styles.proofDivider} />
          <Proof icon="trending-up-outline" label={activeSlide.secondary[0]} value={activeSlide.secondary[1]} />
        </View>
      </Animated.View>

      <View style={styles.sliderControls}>
        {SLIDES.map((slide, index) => {
          const active = index === slideIndex;
          return (
            <Pressable
              key={slide.label}
              accessibilityRole="button"
              accessibilityLabel={`Show ${slide.label.toLowerCase()}`}
              onPress={() => transitionTo(index)}
              style={styles.segment}
            >
              <View style={[styles.segmentBar, active && styles.segmentBarActive]}>
                <View style={[styles.segmentFill, active && styles.segmentFillActive]} />
              </View>
              <ThemedText
                variant="labelRegular"
                color={active ? colors.accentStrong : colors.textMuted}
                style={styles.segmentLabel}
              >
                {slide.label.split(' ')[0]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <GlassButton
          title="Continue with email"
          onPress={() => router.push('/sign-in')}
          leading={<Ionicons name="mail-outline" size={iconSizes.lg} color={colors.textInverse} />}
          trailing={<Ionicons name="arrow-forward" size={iconSizes.lg} color={colors.textInverse} />}
          style={styles.primaryButton}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/sign-up')}
          style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
        >
          <ThemedText variant="bodyMedium" color={colors.accentStrong}>
            Create a new account
          </ThemedText>
        </Pressable>

        <View style={styles.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={iconSizes.sm} color={colors.accent} />
          <ThemedText variant="caption" color={colors.textMuted}>Bank-grade security</ThemedText>
          <View style={styles.trustDot} />
          <Ionicons name="star" size={iconSizes.sm} color={colors.warning} />
          <ThemedText variant="caption" color={colors.textMuted}>Loved by families</ThemedText>
        </View>
      </View>
    </ThemedScreen>
  );
}

function Proof({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.proof}>
      <View style={styles.proofIcon}>
        <Ionicons name={icon} size={iconSizes.sm} color={colors.accent} />
      </View>
      <View>
        <ThemedText variant="label" color={colors.textMuted}>{label}</ThemedText>
        <ThemedText variant="captionBold" color={colors.text}>{value}</ThemedText>
      </View>
    </View>
  );
}

function FinancePreview({ slide, fontsLoaded }: { slide: (typeof SLIDES)[number]; fontsLoaded: boolean }) {
  return (
    <View style={previewStyles.stage}>
      <View style={previewStyles.orbitRing} />
      <GlassCard tint="dark" style={previewStyles.card} padding={0}>
        <Image source={{ uri: slide.image }} style={previewStyles.image} />
        <LinearGradient
          colors={[`${slide.tint[0]}CC`, '#0B201B']}
          style={previewStyles.shade}
        />
        {fontsLoaded ? (
          <View style={previewStyles.watermark} pointerEvents="none">
            <ThemedText color="rgba(255,255,255,0.92)" style={previewStyles.watermarkText}>
              RIFFA
            </ThemedText>
          </View>
        ) : null}
        <View style={previewStyles.topLine}>
          <View style={previewStyles.livePill}>
            <View style={previewStyles.liveDot} />
            <ThemedText variant="labelRegular" color={colors.white}>LIVE</ThemedText>
          </View>
          <View style={previewStyles.arrowChip}>
            <Ionicons name="arrow-up" size={iconSizes.sm} color={colors.textInverse} />
          </View>
        </View>
        <View style={previewStyles.content}>
          <View>
            <ThemedText variant="label" color="rgba(255,255,255,0.78)">{slide.label}</ThemedText>
            <ThemedText variant="display" color={colors.white} style={[previewStyles.amount, { letterSpacing: -1.4 }]}>
              {slide.amount}
            </ThemedText>
          </View>
          <View style={previewStyles.bottomRow}>
            <View style={previewStyles.meta}>
              <Ionicons name="calendar-outline" size={iconSizes.xs} color="rgba(255,255,255,0.7)" />
              <ThemedText variant="caption" color="rgba(255,255,255,0.7)">{slide.period}</ThemedText>
            </View>
            <View style={previewStyles.changePill}>
              <ThemedText variant="captionBold" color={colors.textInverse}>{slide.change}</ThemedText>
            </View>
          </View>
        </View>
        <View style={previewStyles.notch} pointerEvents="none" />
      </GlassCard>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  stage: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  orbitRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    top: -34,
    right: -14,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'rgba(85, 214, 177, 0.28)',
  },
  card: {
    height: 224,
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  shade: {
    ...StyleSheet.absoluteFill,
  },
  topLine: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  amount: {
    marginTop: spacing.xs,
    fontSize: 38,
    lineHeight: 44,
  },
  bottomRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  arrowChip: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermark: {
    position: 'absolute',
    top: spacing.xl + 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  watermarkText: {
    fontSize: 58,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 10,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.16)',
  },
  changePill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  notch: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 76,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
});

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  logoChip: {
    marginLeft: -spacing.lg,
    padding: spacing.sm,
  },
  logo: {
    width: 112,
    height: 44,
    borderRadius: 4,
  },
  securePill: {
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  secureDot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  illustration: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(85, 214, 177, 0.16)',
    top: -40,
    alignSelf: 'center',
  },
  previewMotion: {
    alignSelf: 'stretch',
    marginHorizontal: -spacing.sm,
  },
  sliderControls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: -spacing.xl,
    marginBottom: spacing.xl,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  segmentBar: {
    width: 22,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    overflow: 'hidden',
  },
  segmentBarActive: {
    backgroundColor: colors.surfaceStrong,
  },
  segmentFill: {
    width: 0,
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  segmentFillActive: {
    width: '100%',
  },
  segmentLabel: {
    minWidth: 44,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: -0.8,
  },
  supporting: {
    textAlign: 'center',
    alignSelf: 'center',
    maxWidth: 340,
    marginBottom: spacing.xl,
  },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxxl,
  },
  proof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 116,
  },
  proofIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: colors.borderStrong,
    marginHorizontal: spacing.xl,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    minHeight: 58,
    borderRadius: radius.lg,
  },
  secondary: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    borderRadius: radius.lg,
  },
  secondaryPressed: {
    opacity: 0.7,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginHorizontal: spacing.xs,
  },
});
