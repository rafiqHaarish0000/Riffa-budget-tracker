import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, iconSizes, radius, shadows, spacing } from '../../constants/theme';

type FloatingAddButtonProps = {
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
};

export function FloatingAddButton({ onPress, style }: FloatingAddButtonProps) {
  const [hovered, setHovered] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={[styles.wrapper, style]} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulse,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.26] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.18] }) }],
          },
        ]}
      />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={({ pressed }) => [styles.button, hovered && styles.hovered, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={iconSizes.xxl} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 78,
    height: 78,
    borderRadius: radius.pill,
    backgroundColor: '#07120E',
    borderWidth: 6,
    borderColor: colors.background,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.30)',
    ...shadows.float,
  },
  pulse: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  hovered: {
    transform: [{ scale: 1.06 }],
  },
  pressed: {
    backgroundColor: colors.accentPressed,
    transform: [{ scale: 0.96 }],
  },
});
