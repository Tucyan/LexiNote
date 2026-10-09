export interface ColorTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  card: string;
  cardBorder: string;
  surface: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  border: string;
  inputBg: string;
  divider: string;
  success: string;
  warning: string;
  error: string;
  highlight: string;
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export function getThemeColors(isDark: boolean, accentColor: string = '#10B981'): ColorTheme {
  if (isDark) {
    return {
      primary: accentColor,
      primaryLight: `${accentColor}26`, // 15% opacity
      primaryDark: accentColor,
      background: '#0F172A',
      card: '#1E293B',
      cardBorder: '#334155',
      surface: '#1E293B',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      textTertiary: '#64748B',
      textMuted: '#475569',
      border: '#334155',
      inputBg: '#0F172A',
      divider: '#1E293B',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      highlight: '#FBBF24',
      tabBarBg: '#0F172A',
      tabBarActive: accentColor,
      tabBarInactive: '#64748B',
    };
  }

  return {
    primary: accentColor,
    primaryLight: `${accentColor}1A`, // 10% opacity
    primaryDark: accentColor,
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    surface: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    inputBg: '#F1F5F9',
    divider: '#F1F5F9',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    highlight: '#F59E0B',
    tabBarBg: '#FFFFFF',
    tabBarActive: accentColor,
    tabBarInactive: '#94A3B8',
  };
}
