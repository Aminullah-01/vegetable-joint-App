/**
 * Design Tokens for Vegetable Joint
 * Derived from SRS (UI-02, NFR-COMP-02) and Figma UI Design Prompt.
 * Defined once; applied consistently across Public, Buyer, Seller, and Admin roles.
 */

export const tokens = {
  // Semantic Color Palette
  colors: {
    // Primary - Fresh vegetable green
    primary: '#15803d',
    primaryHover: '#166534',
    primaryLight: '#dcfce7',
    primaryDark: '#14532d',
    primary50: '#f0fdf4',

    // Secondary - Darker agricultural green
    secondary: '#166534',
    secondaryHover: '#14532d',

    // Accent - Natural carrot / vegetable orange
    accent: '#f97316',
    accentHover: '#ea580c',
    accentLight: '#ffedd5',

    // Background & Surfaces
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceSubtle: '#fafafa',
    surfaceMuted: '#f1f5f9',

    // Borders
    border: '#e2e8f0',
    borderFocus: '#15803d',
    borderDark: '#cbd5e1',

    // Text & Content Hierarchy
    textPrimary: '#0f172a', // Deep charcoal
    textSecondary: '#475569', // Balanced slate
    textMuted: '#64748b', // Muted supporting text
    textInverse: '#ffffff',

    // Status / Feedback
    success: '#16a34a',
    successLight: '#dcfce7',
    successText: '#15803d',

    warning: '#d97706',
    warningLight: '#fef3c7',
    warningText: '#b45309',

    error: '#dc2626',
    errorLight: '#fee2e2',
    errorText: '#b91c1c',

    info: '#0284c7',
    infoLight: '#e0f2fe',
    infoText: '#0369a1',
  },

  // Typography System
  typography: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
    fontSize: {
      xs: '0.75rem', // 12px - Caption / Badges
      sm: '0.875rem', // 14px - Body small, secondary labels
      base: '1rem', // 16px - Base body, input text
      lg: '1.125rem', // 18px - Body large, H4
      xl: '1.25rem', // 20px - H3
      '2xl': '1.5rem', // 24px - H2
      '3xl': '1.875rem', // 30px - H1
      '4xl': '2.25rem', // 36px - Display hero headings
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
    },
  },

  // 8px Spacing System
  spacing: {
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px (base unit)
    3: '0.75rem', // 12px
    4: '1rem', // 16px (2x)
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px (3x)
    8: '2rem', // 32px (4x)
    10: '2.5rem', // 40px (5x)
    12: '3rem', // 48px (6x)
    16: '4rem', // 64px (8x)
  },

  // Responsive Breakpoints (NFR-COMP-02: 360px to 1920px)
  breakpoints: {
    sm: '360px', // Mobile min
    md: '768px', // Tablet
    lg: '1024px', // Laptop
    xl: '1280px', // Desktop
    '2xl': '1920px', // Max boundary
  },

  // Border Radii
  radii: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // Elevation / Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
  },

  // Transitions
  transitions: {
    fast: 'all 0.15s ease-in-out',
    normal: 'all 0.25s ease-in-out',
  },
};

export default tokens;
