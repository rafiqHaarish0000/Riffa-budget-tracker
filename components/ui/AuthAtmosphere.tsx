import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, radius } from '../../constants/theme';

export function AuthAtmosphere() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const driftOne = useRef(new Animated.Value(0)).current;
  const driftTwo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      driftOne.setValue(0.5);
      driftTwo.setValue(0.5);
      return;
    }

    const first = Animated.loop(
      Animated.sequence([
        Animated.timing(driftOne, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(driftOne, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const second = Animated.loop(
      Animated.sequence([
        Animated.timing(driftTwo, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(driftTwo, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    first.start();
    second.start();
    return () => {
      first.stop();
      second.stop();
    };
  }, [driftOne, driftTwo, reduceMotion]);

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View
        style={[
          styles.orbOne,
          {
            opacity: driftOne.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.17] }),
            transform: [
              { translateX: driftOne.interpolate({ inputRange: [0, 1], outputRange: [-26, 28] }) },
              { translateY: driftOne.interpolate({ inputRange: [0, 1], outputRange: [-12, 20] }) },
              { scale: driftOne.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orbTwo,
          {
            opacity: driftTwo.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.13] }),
            transform: [
              { translateX: driftTwo.interpolate({ inputRange: [0, 1], outputRange: [22, -24] }) },
              { translateY: driftTwo.interpolate({ inputRange: [0, 1], outputRange: [14, -18] }) },
              { scale: driftTwo.interpolate({ inputRange: [0, 1], outputRange: [1.05, 0.9] }) },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  orbOne: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    top: -90,
    right: -100,
  },
  orbTwo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: radius.pill,
    backgroundColor: colors.accentStrong,
    bottom: 30,
    left: -120,
  },
});
