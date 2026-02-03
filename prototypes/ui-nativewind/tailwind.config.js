/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,tsx}", "./src/**/*.{js,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          tertiary: "var(--color-bg-tertiary)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        accent: {
          purple: "var(--color-accent-purple)",
          mint: "var(--color-accent-mint)",
          yellow: "var(--color-accent-yellow)",
        },
        border: "var(--color-border)",
      },
      fontSize: {
        "body-sm": "var(--font-size-sm)",
        "body-md": "var(--font-size-md)",
        "body-lg": "var(--font-size-lg)",
        "heading-sm": "var(--font-size-heading-sm)",
        "heading-md": "var(--font-size-heading-md)",
        "heading-lg": "var(--font-size-heading-lg)",
      },
      borderWidth: {
        DEFAULT: "var(--border-width)",
      },
      borderRadius: {
        card: "var(--border-radius-card)",
        button: "var(--border-radius-button)",
      },
      spacing: {
        "touch-target": "var(--min-touch-target)",
      },
    },
  },
  plugins: [],
};
