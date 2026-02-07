const { obTokens } = require('@rollercoaster-dev/design-tokens/tailwind')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Spread design-tokens preset (spacing, fontSize, fontWeight, lineHeight,
      // borderRadius, boxShadow, transitionDuration, zIndex)
      ...obTokens.theme.extend,

      // Override colors with CSS variable references for runtime theme switching.
      // The preset provides static palette values, but the app needs dynamic
      // theme colors that change via CSS custom properties.
      colors: {
        ...obTokens.theme.extend.colors,
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

      // Override font-family: keep CSS variable for runtime theme switching
      // (accessibility themes swap fonts), plus preset's named families
      fontFamily: {
        ...obTokens.theme.extend.fontFamily,
        sans: ['var(--ob-font-family)'],
      },
    },
  },
  plugins: [],
}
