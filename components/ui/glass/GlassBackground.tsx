import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import type { PropsWithChildren } from 'react';
import { theme } from '../../../constants/theme';

export function GlassScreenBackground({ children }: PropsWithChildren) {
  return (
    <LinearGradient
      colors={theme.gradient.colors}
      start={theme.gradient.start}
      end={theme.gradient.end}
      style={styles.fill}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
