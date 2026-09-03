export const colors = {
  background: '#0B201B',
  backgroundAlt: '#15342C',
  surface: 'rgba(255, 255, 255, 0.07)',
  surfaceStrong: 'rgba(255, 255, 255, 0.12)',

  text: '#F4F7F0',
  textSecondary: '#B7C9BE',
  textMuted: '#81978A',
  textInverse: '#26200F',

  accent: '#55D6B1',
  accentSoft: 'rgba(85, 214, 177, 0.18)',
  accentStrong: '#C2F4E3',
  accentPressed: '#36B894',

  danger: '#FF8291',
  warning: '#76C9B3',
  info: '#81C7B6',

  border: 'rgba(255, 255, 255, 0.10)',
  borderStrong: 'rgba(255, 255, 255, 0.18)',

  tint: '#174239',

  overlay: 'rgba(0, 0, 0, 0.70)',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type AppColors = typeof colors;
