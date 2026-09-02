import { BlurView } from 'expo-blur';
import { StyleSheet, type ViewStyle } from 'react-native';
import type { PropsWithChildren } from 'react';
import { colors, glass, radius, shadows, spacing } from '../../../constants/theme';

type GlassCardProps = PropsWithChildren<{
  style?: ViewStyle | ViewStyle[];
  tint?: 'light' | 'extraLight' | 'dark' | 'default';
  intensity?: number;
  padding?: number;
}>;

export function GlassCard({
  children,
  style,
  tint = 'extraLight',
  intensity = glass.blur.medium,
  padding = spacing.lg,
}: GlassCardProps) {
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[styles.card, { padding }, style]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.subtle,
  },
});
