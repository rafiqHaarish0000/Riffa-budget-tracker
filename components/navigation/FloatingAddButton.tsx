import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, iconSizes, radius, shadows, spacing } from '../../constants/theme';

type FloatingAddButtonProps = {
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
};

export function FloatingAddButton({ onPress, style }: FloatingAddButtonProps) {
  return (
    <View style={[styles.wrapper, style]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={iconSizes.xxl} color={colors.textInverse} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surface,
    ...shadows.float,
  },
  pressed: {
    backgroundColor: colors.accentStrong,
    transform: [{ scale: 0.96 }],
  },
});
