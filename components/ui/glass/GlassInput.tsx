import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../../constants/theme';

type GlassInputProps = TextInputProps & {
  label?: string;
  icon?: ReactNode;
  style?: ViewStyle | ViewStyle[];
  inputStyle?: TextStyle | TextStyle[];
  secureTextEntry?: boolean;
};

export function GlassInput({
  label,
  icon,
  style,
  inputStyle,
  secureTextEntry,
  ...rest
}: GlassInputProps) {
  const [focused, setFocused] = useState(false);
  const showToggle = secureTextEntry === true;
  const [hidden, setHidden] = useState(showToggle);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          {...rest}
          secureTextEntry={showToggle ? hidden : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, inputStyle]}
          autoCapitalize={rest.autoCapitalize ?? 'none'}
          autoCorrect={rest.autoCorrect ?? false}
        />
        {showToggle ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setHidden((v) => !v)}
            hitSlop={8}
            style={styles.toggle}
          >
            <Text style={styles.toggleLabel}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.lg,
    ...shadows.subtle,
  },
  fieldFocused: {
    borderColor: colors.accent,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 50,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null),
  },
  toggle: {
    paddingLeft: spacing.md,
  },
  toggleLabel: {
    ...typography.captionBold,
    color: colors.accent,
  },
});
