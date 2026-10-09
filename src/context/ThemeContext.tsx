import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ColorTheme, getThemeColors } from '@/constants/colors';
import { AppSettings } from '@/types';

interface ThemeContextType {
  colors: ColorTheme;
  isDark: boolean;
  themeMode: AppSettings['theme_mode'];
  accentColor: string;
  fontSize: AppSettings['font_size'];
  density: AppSettings['density'];
  fontScale: number;
  spacingMultiplier: number;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  settings: AppSettings;
}

export function ThemeProvider({ children, settings }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (settings.theme_mode === 'dark') return true;
    if (settings.theme_mode === 'light') return false;
    return systemColorScheme === 'dark';
  }, [settings.theme_mode, systemColorScheme]);

  const colors = useMemo(() => {
    return getThemeColors(isDark, settings.accent_color);
  }, [isDark, settings.accent_color]);

  const fontScale = useMemo(() => {
    switch (settings.font_size) {
      case 'small':
        return 0.9;
      case 'large':
        return 1.15;
      default:
        return 1.0;
    }
  }, [settings.font_size]);

  const spacingMultiplier = useMemo(() => {
    return settings.density === 'compact' ? 0.8 : 1.0;
  }, [settings.density]);

  return (
    <ThemeContext.Provider
      value={{
        colors,
        isDark,
        themeMode: settings.theme_mode,
        accentColor: settings.accent_color,
        fontSize: settings.font_size,
        density: settings.density,
        fontScale,
        spacingMultiplier,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
