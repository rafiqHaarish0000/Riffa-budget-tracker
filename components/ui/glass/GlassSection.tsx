import { StyleSheet, View, type ViewStyle, type TextStyle } from 'react-native';
import type { PropsWithChildren } from 'react';
import { colors, spacing } from '../../../constants/theme';
import { ThemedText } from '../ThemedText';

type GlassSectionProps = PropsWithChildren<{
  title?: string;
  style?: ViewStyle | ViewStyle[];
  titleStyle?: TextStyle | TextStyle[];
}>;

export function GlassSection({ title, style, titleStyle, children }: GlassSectionProps) {
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <ThemedText
          variant="subheading"
          color={colors.text}
          style={[styles.title, titleStyle].filter(Boolean) as TextStyle[]}
        >
          {title}
        </ThemedText>
      ) : null}
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
    paddingHorizontal: spacing.xs,
  },
});
