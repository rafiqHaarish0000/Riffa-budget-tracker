import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { PropsWithChildren } from 'react';
import { colors, spacing, typography } from '../../../constants/theme';

type GlassSectionProps = PropsWithChildren<{
  title?: string;
  style?: ViewStyle | ViewStyle[];
}>;

export function GlassSection({ title, style, children }: GlassSectionProps) {
  return (
    <View style={[styles.section, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.subheading,
    color: colors.text,
    marginBottom: spacing.md,
  },
});
