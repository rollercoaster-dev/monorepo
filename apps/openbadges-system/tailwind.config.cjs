/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
      fontFamily: {
        sans: ['var(--ob-font-family)'],
      },
      boxShadow: {
        'hard-sm': 'var(--ob-shadow-hard-sm)',
        'hard-md': 'var(--ob-shadow-hard-md)',
        'hard-lg': 'var(--ob-shadow-hard-lg)',
        focus: 'var(--ob-shadow-focus)',
      },
      borderRadius: {
        sm: 'var(--ob-radius-sm)',
        md: 'var(--ob-radius-md)',
        lg: 'var(--ob-radius-lg)',
        xl: 'var(--ob-radius-xl)',
      },
    },
  },
  plugins: [],
}
