import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors, radius, shadows, spacing } from '../../../constants/theme';
import { ThemedText } from '../ThemedText';

type GlassButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  loadingTitle?: string;
  style?: StyleProp<ViewStyle>;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
};

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  loadingTitle,
  style,
  leading,
  trailing,
}: GlassButtonProps) {
  const palette = {
    primary: { bg: colors.accent, fg: colors.textInverse, border: colors.accent },
    secondary: { bg: colors.surfaceStrong, fg: colors.text, border: colors.borderStrong },
    ghost: { bg: colors.transparent, fg: colors.accent, border: colors.transparent },
    destructive: { bg: colors.danger, fg: colors.textInverse, border: colors.danger },
  }[variant];

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        loadingTitle ? (
          <View style={styles.content}>
            <ActivityIndicator color={palette.fg} />
            <ThemedText variant="bodyMedium" color={palette.fg}>{loadingTitle}</ThemedText>
          </View>
        ) : (
          <ActivityIndicator color={palette.fg} />
        )
      ) : (
        <View style={styles.content}>
          {leading}
          <ThemedText variant="bodyMedium" color={palette.fg}>{title}</ThemedText>
          {trailing}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    ...shadows.subtle,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
