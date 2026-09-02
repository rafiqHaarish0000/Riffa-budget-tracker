export const glass = {
  opacity: {
    light: 0.1,
    soft: 0.2,
    medium: 0.32,
    solid: 0.85,
  },
  blur: {
    light: 12,
    medium: 24,
    heavy: 40,
  },
  saturation: 160,
} as const;

export type Glass = typeof glass;
