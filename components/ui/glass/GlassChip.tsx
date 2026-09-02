import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../../constants/theme';

type GlassChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function GlassChip({ label, selected = false, onPress, style }: GlassChipProps) {
  const isInteractive = typeof onPress === 'function';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      disabled={!isInteractive}
      style={[styles.chip, selected && styles.chipSelected, style]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    minWidth: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  label: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.textInverse,
  },
});
