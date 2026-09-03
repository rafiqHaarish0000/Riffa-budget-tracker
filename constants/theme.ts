import { colors } from './colors';
import { spacing } from './spacing';
import { typography, fontFamily, fontWeight } from './typography';
import { radius } from './radius';
import { shadows } from './shadows';
import { glass } from './glass';
import { iconSizes } from './icons';

export const theme = {
  colors,
  spacing,
  typography,
  fontFamily,
  fontWeight,
  radius,
  shadows,
  glass,
  iconSizes,

  minTouchTarget: 44,
  screenPadding: spacing.lg,
  gradient: {
    colors: [colors.background, colors.backgroundAlt, colors.background] as [string, string, ...string[]],
    start: { x: 0, y: 0 } as const,
    end: { x: 1, y: 1 } as const,
  },
} as const;

export type AppTheme = typeof theme;

export { colors, spacing, typography, radius, shadows, glass, iconSizes, fontFamily, fontWeight };
