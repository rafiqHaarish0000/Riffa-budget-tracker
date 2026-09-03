import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';
import { GlassCard } from '../ui/glass';
import { ThemedText } from '../ui/ThemedText';

type BudgetCardProps = {
  budget: number;
  spent: number;
};

const BUDGET_IMAGE_URI =
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=85';

export function BudgetCard({ budget, spent }: BudgetCardProps) {
  const remaining = budget - spent;
  const ratio = budget > 0 ? spent / budget : 0;
  const progress = Math.min(1, Math.max(0, ratio));
  const accent =
    ratio > 1 ? colors.danger : ratio > 0.8 ? colors.warning : colors.accent;
  const borderPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(borderPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(borderPulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [borderPulse]);

  return (
    <GlassCard style={styles.card}>
      <Image source={{ uri: BUDGET_IMAGE_URI }} style={styles.cardImage} />
      <View style={styles.imageShade} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.animatedBorder,
          {
            opacity: borderPulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.58] }),
            transform: [{ scale: borderPulse.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }],
          },
        ]}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View>
            <ThemedText variant="label" color={colors.textMuted} style={styles.eyebrow}>
              AVAILABLE TO SPEND
            </ThemedText>
            <ThemedText variant="display" color={remaining < 0 ? colors.danger : colors.text} style={styles.balance}>
              {formatCurrency(Math.max(0, remaining))}
            </ThemedText>
            <ThemedText variant="caption" color={colors.textSecondary}>
              from today&apos;s budget
            </ThemedText>
          </View>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet-outline" size={iconSizes.xl} color={colors.accentStrong} />
          </View>
        </View>

        <View style={styles.progressMeta}>
          <ThemedText variant="captionBold" color={colors.textSecondary}>
            {Math.round(progress * 100)}% used
          </ThemedText>
          <ThemedText variant="captionBold" color={colors.textSecondary}>
            Daily limit {formatCurrency(budget)}
          </ThemedText>
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
        </View>

        <View style={styles.bottomRow}>
          <View>
            <ThemedText variant="label" color={colors.textMuted}>
              SPENT TODAY
            </ThemedText>
            <ThemedText variant="subheading" color={colors.text}>
              {formatCurrency(spent)}
            </ThemedText>
          </View>
          <View style={styles.remaining}>
            <ThemedText variant="label" color={colors.textMuted}>
              DAILY BUDGET
            </ThemedText>
            <ThemedText variant="subheading" color={remaining < 0 ? colors.danger : colors.text}>
              {formatCurrency(budget)}
            </ThemedText>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  cardImage: {
    ...StyleSheet.absoluteFill,
    opacity: 0.30,
  },
  imageShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 30, 24, 0.74)',
  },
  content: {
    zIndex: 1,
  },
  animatedBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    letterSpacing: 0.7,
    marginBottom: spacing.xs,
  },
  balance: {
    letterSpacing: -1,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  remaining: {
    alignItems: 'flex-end',
  },
});
