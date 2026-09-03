import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { PropsWithChildren } from 'react';
import { colors, spacing } from '../../../constants/theme';
import { ThemedText } from '../ThemedText';

type GlassSectionProps = PropsWithChildren<{
  title?: string;
  style?: ViewStyle | ViewStyle[];
}>;

export function GlassSection({ title, style, children }: GlassSectionProps) {
  return (
    <View style={[styles.section, style]}>
      {title ? <ThemedText variant="subheading" color={colors.text} style={styles.title}>{title}</ThemedText> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl,
  },
  title: {
    marginBottom: spacing.md,
  },
});
