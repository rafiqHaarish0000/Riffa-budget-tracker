export const shadows = {
  subtle: {
    shadowColor: '#1C2622',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  soft: {
    shadowColor: '#1C2622',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
  },
  float: {
    shadowColor: '#1C2622',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 8,
  },
} as const;

export type Shadows = typeof shadows;
