import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../constants/theme';
import { ThemedText } from '../ui/ThemedText';

type ProgressRingProps = {
  progress: number; // 0..1
  size?: number;
  thickness?: number;
  color?: string;
  centerValue?: string;
  centerCaption?: string;
  captionColor?: string;
};

/**
 * A single-arc glass progress ring with a 3D depth treatment: a darker side
 * wall, a gradient-lit progress stroke with rounded caps, an inner radial well,
 * and a glossy gradient hub showing the current value.
 */
export function ProgressRing({
  progress,
  size = 132,
  thickness = 12,
  color = colors.accent,
  centerValue,
  centerCaption,
  captionColor = colors.textMuted,
}: ProgressRingProps) {
  const cx = size / 2;
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.95" />
            <Stop offset="1" stopColor={colors.accentStrong} stopOpacity="0.95" />
          </SvgLinearGradient>
          <SvgLinearGradient id={`well-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#16382D" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#081A14" stopOpacity="0.95" />
          </SvgLinearGradient>
        </Defs>

        <Circle cx={cx} cy={cx} r={radius} fill="none" stroke="#0A231B" strokeWidth={thickness + 4} opacity={0.5} />
        <Circle cx={cx} cy={cx} r={radius} fill="none" stroke={colors.border} strokeWidth={thickness} />
        <Circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke={`url(#ring-${uid})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        <Circle cx={cx} cy={cx} r={radius - thickness} fill={`url(#well-${uid})`} />
      </Svg>

      <LinearGradient
        colors={['#173A2F', '#0A201A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.hub,
          {
            width: size - thickness * 3,
            height: size - thickness * 3,
            borderRadius: (size - thickness * 3) / 2,
          },
        ]}
      >
        {centerValue ? (
          <ThemedText
            variant="title"
            color={colors.text}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.value, { fontSize: size * 0.2 }]}
          >
            {centerValue}
          </ThemedText>
        ) : null}
        {centerCaption ? (
          <ThemedText variant="caption" color={captionColor} numberOfLines={1} style={{ fontSize: size * 0.11 }}>
            {centerCaption}
          </ThemedText>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hub: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  value: {
    marginBottom: 2,
    fontWeight: '700',
  },
});
