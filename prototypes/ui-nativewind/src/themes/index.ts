export const themeNames = [
  "light",
  "dark",
  "highContrast",
  "largeText",
  "dyslexia",
  "lowVision",
  "autismFriendly",
] as const;

export type ThemeName = (typeof themeNames)[number];

export type ThemeTokens = Record<`--${string}`, string | number>;

const baseTokens = {
  "--font-size-sm": "14px",
  "--font-size-md": "16px",
  "--font-size-lg": "18px",
  "--font-size-heading-sm": "20px",
  "--font-size-heading-md": "24px",
  "--font-size-heading-lg": "32px",
  "--border-width": "1px",
  "--border-radius-card": "12px",
  "--border-radius-button": "8px",
  "--min-touch-target": "44px",
};

export const themes: Record<ThemeName, ThemeTokens> = {
  light: {
    ...baseTokens,
    "--color-bg-primary": "#ffffff",
    "--color-bg-secondary": "#f5f5f5",
    "--color-bg-tertiary": "#e5e5e5",
    "--color-text-primary": "#1a1a1a",
    "--color-text-secondary": "#4a4a4a",
    "--color-text-muted": "#8a8a8a",
    "--color-accent-purple": "#8b5cf6",
    "--color-accent-mint": "#34d399",
    "--color-accent-yellow": "#fbbf24",
    "--color-border": "#d4d4d4",
  },

  dark: {
    ...baseTokens,
    "--color-bg-primary": "#1a1a1a",
    "--color-bg-secondary": "#2a2a2a",
    "--color-bg-tertiary": "#3a3a3a",
    "--color-text-primary": "#fafafa",
    "--color-text-secondary": "#d4d4d4",
    "--color-text-muted": "#8a8a8a",
    "--color-accent-purple": "#a78bfa",
    "--color-accent-mint": "#6ee7b7",
    "--color-accent-yellow": "#fcd34d",
    "--color-border": "#4a4a4a",
  },

  highContrast: {
    ...baseTokens,
    "--color-bg-primary": "#000000",
    "--color-bg-secondary": "#1a1a1a",
    "--color-bg-tertiary": "#333333",
    "--color-text-primary": "#ffffff",
    "--color-text-secondary": "#ffffff",
    "--color-text-muted": "#cccccc",
    "--color-accent-purple": "#d4a5ff",
    "--color-accent-mint": "#00ff9d",
    "--color-accent-yellow": "#ffff00",
    "--color-border": "#ffffff",
    "--border-width": "2px",
  },

  largeText: {
    ...baseTokens,
    "--color-bg-primary": "#ffffff",
    "--color-bg-secondary": "#f5f5f5",
    "--color-bg-tertiary": "#e5e5e5",
    "--color-text-primary": "#1a1a1a",
    "--color-text-secondary": "#4a4a4a",
    "--color-text-muted": "#6a6a6a",
    "--color-accent-purple": "#8b5cf6",
    "--color-accent-mint": "#34d399",
    "--color-accent-yellow": "#fbbf24",
    "--color-border": "#d4d4d4",
    "--font-size-sm": "18px",
    "--font-size-md": "20px",
    "--font-size-lg": "24px",
    "--font-size-heading-sm": "28px",
    "--font-size-heading-md": "32px",
    "--font-size-heading-lg": "40px",
    "--min-touch-target": "52px",
  },

  dyslexia: {
    ...baseTokens,
    "--color-bg-primary": "#f8f5e4",
    "--color-bg-secondary": "#f0edd6",
    "--color-bg-tertiary": "#e8e5c8",
    "--color-text-primary": "#3d3d3d",
    "--color-text-secondary": "#5a5a5a",
    "--color-text-muted": "#7a7a7a",
    "--color-accent-purple": "#7c4dff",
    "--color-accent-mint": "#2e9e6e",
    "--color-accent-yellow": "#e6a700",
    "--color-border": "#c4c1a4",
    "--font-family": "OpenDyslexic",
    "--font-size-sm": "16px",
    "--font-size-md": "18px",
    "--font-size-lg": "20px",
  },

  lowVision: {
    ...baseTokens,
    "--color-bg-primary": "#000000",
    "--color-bg-secondary": "#1a1a1a",
    "--color-bg-tertiary": "#2a2a2a",
    "--color-text-primary": "#ffffff",
    "--color-text-secondary": "#e5e5e5",
    "--color-text-muted": "#b0b0b0",
    "--color-accent-purple": "#e0b0ff",
    "--color-accent-mint": "#80ffcc",
    "--color-accent-yellow": "#ffff80",
    "--color-border": "#ffffff",
    "--border-width": "3px",
    "--font-size-sm": "20px",
    "--font-size-md": "24px",
    "--font-size-lg": "28px",
    "--font-size-heading-sm": "32px",
    "--font-size-heading-md": "40px",
    "--font-size-heading-lg": "48px",
    "--min-touch-target": "56px",
    "--border-radius-card": "16px",
    "--border-radius-button": "12px",
  },

  autismFriendly: {
    ...baseTokens,
    "--color-bg-primary": "#f7f7f7",
    "--color-bg-secondary": "#efefef",
    "--color-bg-tertiary": "#e7e7e7",
    "--color-text-primary": "#333333",
    "--color-text-secondary": "#555555",
    "--color-text-muted": "#777777",
    "--color-accent-purple": "#9999cc",
    "--color-accent-mint": "#99ccaa",
    "--color-accent-yellow": "#cccc99",
    "--color-border": "#cccccc",
    "--shadow-opacity": "0",
    "--border-radius-card": "4px",
    "--border-radius-button": "4px",
  },
};

export const themeDisplayNames: Record<ThemeName, string> = {
  light: "Light",
  dark: "Dark",
  highContrast: "High Contrast",
  largeText: "Large Text",
  dyslexia: "Dyslexia Friendly",
  lowVision: "Low Vision",
  autismFriendly: "Autism Friendly",
};

export const themeDescriptions: Record<ThemeName, string> = {
  light: "Standard light theme with good contrast",
  dark: "Dark theme to reduce eye strain",
  highContrast: "Maximum contrast for visibility",
  largeText: "Increased font sizes throughout",
  dyslexia: "Optimized fonts and spacing for dyslexia",
  lowVision: "Extra large text and touch targets",
  autismFriendly: "Reduced visual complexity and muted colors",
};

export function isDarkTheme(theme: ThemeName): boolean {
  return theme === "dark" || theme === "highContrast" || theme === "lowVision";
}
