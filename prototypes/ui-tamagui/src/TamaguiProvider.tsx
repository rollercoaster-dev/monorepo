import { TamaguiProvider as TamaguiProviderOG, Theme } from '@tamagui/core';
import { createContext, useContext, useState, ReactNode } from 'react';
import config from '../tamagui.config';

export type ThemeName =
  | 'light'
  | 'dark'
  | 'highContrast'
  | 'largeText'
  | 'dyslexia'
  | 'lowVision'
  | 'autismFriendly';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useThemeName() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeName must be used within TamaguiProvider');
  return ctx;
}

interface Props {
  children: ReactNode;
}

export function TamaguiProvider({ children }: Props) {
  const [theme, setTheme] = useState<ThemeName>('light');

  return (
    <TamaguiProviderOG config={config} defaultTheme="light">
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <Theme name={theme}>{children}</Theme>
      </ThemeContext.Provider>
    </TamaguiProviderOG>
  );
}
