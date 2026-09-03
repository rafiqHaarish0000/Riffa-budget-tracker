import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../../constants/theme';
import { ThemedText } from '../ThemedText';

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
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      disabled={!isInteractive}
      style={[styles.chip, selected && styles.chipSelected, style]}
    >
      <ThemedText
        variant="captionBold"
        color={selected ? colors.textInverse : colors.textSecondary}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
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
});
