import { Motion } from './motion';

export const Theme = {
  colors: {
    // Backgrounds
    background: '#0A0A0B',       // Deep obsidian dark
    backgroundSecondary: '#151518', // Surface dark
    surface: '#151518',            // Midnight slate
    surfaceElevated: '#1E1E22',    // Raised container
    
    // Brand / Accents
    primary: '#DFB978',           // Warm Champagne Gold
    primaryHover: '#D4AF37',
    accent: '#DFB978',            // Warm Champagne Gold secondary

    // Text Content
    textPrimary: '#FAFAFA',       // High contrast white
    textSecondary: '#9A9AA0',     // Muted gray-blue
    textMuted: '#71717A',         // Low-contrast gray
    textOnPrimary: '#0A0A0B',     // Black text when overlaying primary color

    // Borders / Utilities
    border: '#2A2A30',            // Dividers
    borderLight: '#1E1E22',
    
    // Status
    success: '#32D583',           // Green success
    danger: '#FF5C5C',            // Red error
    warning: '#DFB978',           // Amber gold
    info: '#3B82F6',              // Blue
  },

  typography: {
    // Primary UI font — Geist (loaded locally from assets/fonts/)
    fontFamily: 'GeistRegular',
    fontFamilyMedium: 'GeistMedium',
    fontFamilySemiBold: 'GeistSemiBold',
    fontFamilyBold: 'GeistBold',

    // Editorial font — Lora (used for titles, headings, hero text only)
    fontFamilyEditorial: 'LoraRegular',
    fontFamilyEditorialSemiBold: 'LoraSemiBold',
    fontFamilyEditorialBold: 'LoraBold',

    sizes: {
      xxs: 9,
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 20,
      h3: 22,
      h2: 24,
      h1: 28,
      display: 32,
      hero: 36,
      splash: 48,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semiBold: '600' as const,
      bold: '700' as const,
      black: '900' as const,
    },
    letterSpacing: {
      tighter: -1.5,
      tight: -0.5,
      normal: 0,
      wide: 0.2,
      wider: 0.5,
      widest: 1,
    },
    lineHeights: {
      xs: 14,
      sm: 16,
      md: 18,
      lg: 20,
      xl: 22,
      xxl: 28,
      hero: 40,
    },
  },

  spacing: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },

  borderRadius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.44,
      shadowRadius: 10.32,
      elevation: 16,
    },
  },

  opacity: {
    solid: 1,
    active: 0.8,
    dim: 0.6,
    muted: 0.4,
    translucent: 0.2,
    hidden: 0,
  },

  blur: {
    light: 10,
    normal: 20,
    high: 30,
  },

  iconSizes: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },

  touchTargets: {
    minHeight: 44,
    minWidth: 44,
  },

  floatingDock: {
    height: 64,
    padding: 12,
    bottomOffset: 24,
  },

  motion: Motion,
} as const;

export type ThemeType = typeof Theme;
