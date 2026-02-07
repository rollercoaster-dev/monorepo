const { obTokens } = require('@rollercoaster-dev/design-tokens/tailwind')

const preset = obTokens.theme.extend

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // --- Safe to import from preset (static, non-themeable) ---
      spacing: preset.spacing,
      fontWeight: preset.fontWeight,
      transitionDuration: preset.transitionDuration,
      zIndex: preset.zIndex,

      // Named font families from preset + runtime CSS variable for theme switching
      fontFamily: {
        ...preset.fontFamily,
        sans: ['var(--ob-font-family)'],
      },

      // --- CSS variable references for runtime theme switching ---
      // Colors must use CSS variables so accessibility themes can swap them.
      colors: {
        background: 'var(--ob-background)',
        foreground: 'var(--ob-foreground)',
        card: {
          DEFAULT: 'var(--ob-card)',
          foreground: 'var(--ob-card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--ob-popover)',
          foreground: 'var(--ob-popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--ob-primary)',
          foreground: 'var(--ob-primary-foreground)',
          dark: 'var(--ob-primary-dark)',
          light: 'var(--ob-primary-light)',
        },
        secondary: {
          DEFAULT: 'var(--ob-secondary)',
          foreground: 'var(--ob-secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--ob-muted)',
          foreground: 'var(--ob-muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--ob-accent)',
          foreground: 'var(--ob-accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--ob-destructive)',
          foreground: 'var(--ob-destructive-foreground)',
        },
        success: {
          DEFAULT: 'var(--ob-success)',
          foreground: 'var(--ob-success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--ob-warning)',
          foreground: 'var(--ob-warning-foreground)',
        },
        info: {
          DEFAULT: 'var(--ob-info)',
          foreground: 'var(--ob-info-foreground)',
        },
        border: 'var(--ob-border)',
        input: 'var(--ob-input)',
        ring: 'var(--ob-ring)',
      },

      // Shadows use CSS variables so focus rings adapt to accessibility themes.
      // Preset defines shadow-sm/md as "none" which would break Tailwind defaults.
      boxShadow: {
        'hard-sm': 'var(--ob-shadow-hard-sm)',
        'hard-md': 'var(--ob-shadow-hard-md)',
        'hard-lg': 'var(--ob-shadow-hard-lg)',
        focus: 'var(--ob-shadow-focus)',
      },

      // Border radius uses CSS variables for theme-aware rounding.
      borderRadius: {
        sm: 'var(--ob-radius-sm)',
        md: 'var(--ob-radius-md)',
        lg: 'var(--ob-radius-lg)',
        xl: 'var(--ob-radius-xl)',
      },

      // NOTE: fontSize and lineHeight are intentionally NOT imported from preset.
      // The preset provides bare strings (e.g. "0.875rem") but Tailwind expects
      // tuples with line-height (e.g. ["0.875rem", { lineHeight: "1.25rem" }]).
      // Importing would strip all paired line-heights from 383 usages.
    },
  },
  plugins: [],
}
