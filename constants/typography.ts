import { Platform } from 'react-native';

export const fontFamily = Platform.select({
  ios: '-apple-system, BlinkMacSystemFont',
  android: 'sans-serif',
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}) as string;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: fontWeight.bold, fontFamily },
  title: { fontSize: 28, lineHeight: 34, fontWeight: fontWeight.bold, fontFamily },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: fontWeight.semibold, fontFamily },
  subheading: { fontSize: 17, lineHeight: 24, fontWeight: fontWeight.semibold, fontFamily },
  body: { fontSize: 16, lineHeight: 24, fontWeight: fontWeight.regular, fontFamily },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: fontWeight.medium, fontFamily },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.regular, fontFamily },
  captionBold: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.semibold, fontFamily },
  label: { fontSize: 11, lineHeight: 14, fontWeight: fontWeight.semibold, fontFamily },
  labelRegular: { fontSize: 11, lineHeight: 14, fontWeight: fontWeight.regular, fontFamily },
} as const;

export type Typography = typeof typography;
