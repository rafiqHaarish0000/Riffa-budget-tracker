import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { colors, radius, shadows } from '../../constants/theme';
import { ThemedText } from '../ui/ThemedText';

type Segment = {
  key: string;
  value: number;
  color: string;
};

type DonutSegmentChartProps = {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerTitle?: string;
  centerValue?: string;
  centerCaption?: string;
};

/**
 * A segment donut rendered with SVG, styled with a subtle "3D" depth treatment:
 * a darker backing ring (the ring side), a gradient-lit segment stroke, rounded
 * caps, an inner radial well, and a glossy glass hub with the totals in the
 * centre. Respects the deep-green glassmorphism palette.
 */
export function DonutSegmentChart({
  segments,
  size = 220,
  thickness = 26,
  centerTitle,
  centerValue,
  centerCaption,
}: DonutSegmentChartProps) {
  const cx = size / 2;
  const outerRadius = (size - thickness) / 2;
  const innerRadius = outerRadius - thickness;
  const midRadius = (outerRadius + innerRadius) / 2;

  const total = useMemo(
    () => segments.reduce((sum, s) => sum + Math.max(0, s.value), 0),
    [segments],
  );

  const arcs = useMemo(() => {
    let angleAccum = 0;
    return segments
      .filter((s) => s.value > 0)
      .map((s) => {
        const frac = total > 0 ? s.value / total : 0;
        const startAngle = angleAccum * 360;
        angleAccum += frac;
        const endAngle = angleAccum * 360;
        return { ...s, startAngle, endAngle, frac };
      });
  }, [segments, total]);

  function polar(cx2: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx2 + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startDeg: number, endDeg: number) {
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    const start = polar(cx, cx, midRadius, startDeg + 0.35);
    const end = polar(cx, cx, midRadius, endDeg - 0.35);
    return `M ${start.x} ${start.y} A ${midRadius} ${midRadius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  // Visual "3D" backing ring: a full darker circle that sits behind the arcs
  // and reads as the depth/side wall of the donut.
  return (
    <View style={styles.wrap}>
      <View style={[styles.shadowPillow, { borderRadius: size / 2 }]} />
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <SvgLinearGradient id="wellGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#1E4B3C" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#081a14" stopOpacity="0.95" />
          </SvgLinearGradient>
          <SvgLinearGradient id="sideGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0E2A21" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#05130E" stopOpacity="0.9" />
          </SvgLinearGradient>
        </Defs>

        {/* 3D side walls (offset dark ring beneath) */}
        <Circle
          cx={cx + 4}
          cy={cx + 6}
          r={outerRadius}
          fill="url(#sideGrad)"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth={0.6}
        />
        <Circle
          cx={cx - 2}
          cy={cx + 3}
          r={outerRadius}
          fill="#0A231B"
          opacity={0.6}
        />

        {/* Segment arcs with rounded caps and gradient stroke */}
        <G>
          {arcs.map((segment) => {
            const id = `seg-${segment.key.replace(/\W+/g, '')}-${segment.startAngle.toFixed(0)}`;
            const isFull = segment.endAngle - segment.startAngle >= 359.9;
            const segmentPath = isFull ? null : arcPath(segment.startAngle, segment.endAngle);
            return (
              <G key={segment.key}>
                <Defs>
                  <SvgLinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={segment.color} stopOpacity="0.55" />
                    <Stop offset="0.5" stopColor={segment.color} stopOpacity="1" />
                    <Stop offset="1" stopColor={segment.color} stopOpacity="0.7" />
                  </SvgLinearGradient>
                </Defs>
                {isFull ? (
                  <Circle
                    cx={cx}
                    cy={cx}
                    r={midRadius}
                    stroke={`url(#${id})`}
                    strokeWidth={thickness}
                    fill="none"
                  />
                ) : (
                  <Path
                    d={segmentPath!}
                    stroke={`url(#${id})`}
                    strokeWidth={thickness}
                    strokeLinecap="round"
                    fill="none"
                    strokeOpacity={1}
                  />
                )}
                {isFull ? (
                  <Circle
                    cx={cx}
                    cy={cx}
                    r={midRadius}
                    stroke={segment.color}
                    strokeWidth={thickness * 0.35}
                    fill="none"
                    opacity={0.25}
                  />
                ) : (
                  <Path
                    d={segmentPath!}
                    stroke={segment.color}
                    strokeWidth={thickness * 0.35}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.25}
                  />
                )}
              </G>
            );
          })}
        </G>

        {/* Inner well that deepens the center hub */}
        <Circle
          cx={cx}
          cy={cx}
          r={innerRadius}
          fill="url(#wellGrad)"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      </Svg>

      {/* Center hub */}
      <LinearGradient
        colors={['#16382D', '#0B201B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hub, { width: innerRadius * 2 - 10, height: innerRadius * 2 - 10, borderRadius: innerRadius - 5 }]}
      >
        <View style={styles.hubGlow} />
        {centerTitle ? (
          <ThemedText variant="label" color={colors.textMuted} style={styles.hubTitle}>
            {centerTitle}
          </ThemedText>
        ) : null}
        {centerValue ? (
          <ThemedText variant="display" color={colors.text} style={styles.hubValue} numberOfLines={1}>
            {centerValue}
          </ThemedText>
        ) : null}
        {centerCaption ? (
          <ThemedText variant="caption" color={colors.textMuted} style={styles.hubCaption}>
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
    alignSelf: 'center',
  },
  svg: {
    position: 'relative',
  },
  shadowPillow: {
    position: 'absolute',
    top: 6,
    bottom: -6,
    left: -6,
    right: -6,
    backgroundColor: 'transparent',
    ...shadows.float,
  },
  hub: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  hubGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  hubTitle: {
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  hubValue: {
    fontSize: 22,
    lineHeight: 28,
    marginHorizontal: 16,
    textAlign: 'center',
  },
  hubCaption: {
    marginTop: 2,
    textAlign: 'center',
  },
});
