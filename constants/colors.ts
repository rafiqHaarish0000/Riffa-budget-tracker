export const colors = {
  background: '#F5F6F4',
  backgroundAlt: '#ECEFEB',
  surface: 'rgba(255, 255, 255, 0.72)',
  surfaceStrong: 'rgba(255, 255, 255, 0.92)',

  text: '#1C2622',
  textSecondary: '#5B6B64',
  textMuted: '#8A9891',
  textInverse: '#FFFFFF',

  accent: '#5B8A72',
  accentSoft: '#DCE9E2',
  accentStrong: '#436A56',
  accentPressed: '#2F5240',

  danger: '#C0564F',
  warning: '#C98A3A',
  info: '#4E7C99',

  border: 'rgba(28, 38, 34, 0.08)',
  borderStrong: 'rgba(28, 38, 34, 0.16)',

  tint: '#EAF0EB',

  overlay: 'rgba(28, 38, 34, 0.32)',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type AppColors = typeof colors;
