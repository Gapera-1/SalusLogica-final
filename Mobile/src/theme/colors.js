/**
 * SalusLogica Healthcare Theme
 * Consistent color palette for mobile app
 */

export const colors = {
  // Primary - Calming Teal
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    DEFAULT: '#0d9488',
  },

  // Accent - Warm Coral/Orange
  accent: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    DEFAULT: '#f97316',
  },

  // Semantic - Safe (Emerald)
  safe: {
    light: '#d1fae5',
    DEFAULT: '#10b981',
    dark: '#065f46',
  },

  // Semantic - Danger (Red)
  danger: {
    light: '#fee2e2',
    DEFAULT: '#ef4444',
    dark: '#991b1b',
  },

  // Semantic - Caution (Amber)
  caution: {
    light: '#fef3c7',
    DEFAULT: '#f59e0b',
    dark: '#92400e',
  },

  // Semantic - Info (Sky)
  info: {
    light: '#e0f2fe',
    DEFAULT: '#0ea5e9',
    dark: '#075985',
  },

  // Neutrals
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Backgrounds
  background: {
    page: '#f0fdfa',
    card: '#ffffff',
    secondary: '#f9fafb',
  },

  // Text
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    muted: '#9ca3af',
    inverse: '#ffffff',
  },

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  nav: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text.primary,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.text.secondary,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
};

export default { colors, spacing, borderRadius, shadows, typography };
