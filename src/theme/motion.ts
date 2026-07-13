import { Easing } from 'react-native';

export const Motion = {
  // Reusable animation durations (ms)
  duration: {
    instant: 100,
    fast: 150,
    normal: 250,
    slow: 400,
    major: 600,
    confirm: 800,
    verySlow: 600,
  },

  // Reusable easing functions
  easing: {
    standard: Easing.bezier(0.4, 0, 0.2, 1),
    decelerate: Easing.bezier(0, 0, 0.2, 1),
    accelerate: Easing.bezier(0.4, 0, 1, 1),
    sharp: Easing.bezier(0.4, 0, 0.6, 1),
  },

  // Physics-based spring presets for Reanimated / Animated APIs
  springs: {
    fast: {
      damping: 15,
      stiffness: 220,
      mass: 0.8,
    },
    default: {
      damping: 20,
      stiffness: 150,
      mass: 1,
    },
    gentle: {
      damping: 25,
      stiffness: 120,
      mass: 0.8,
    },
    bouncy: {
      damping: 12,
      stiffness: 180,
      mass: 0.8,
    },
    stiff: {
      damping: 26,
      stiffness: 210,
      mass: 1,
    },
  },

  // Component-specific animation presets
  presets: {
    press: {
      scale: 0.96,
      duration: 100,
      easing: Easing.out(Easing.ease),
    },
    floatingDock: {
      damping: 24,
      stiffness: 220,
      mass: 0.8,
    },
    bottomSheet: {
      damping: 28,
      stiffness: 180,
      mass: 1.1,
    },
    fade: {
      duration: 200,
      easing: Easing.out(Easing.ease),
    },
    slide: {
      duration: 300,
      easing: Easing.out(Easing.ease),
    },
    scale: {
      duration: 150,
      easing: Easing.out(Easing.ease),
    },
  },
} as const;

export type ThemeMotion = typeof Motion;
