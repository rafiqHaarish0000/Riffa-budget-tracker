import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type FadeInViewProps = PropsWithChildren<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function FadeInView({ children, delay = 0, style }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    const useNativeDriver = Platform.OS !== 'web';
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, delay, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}