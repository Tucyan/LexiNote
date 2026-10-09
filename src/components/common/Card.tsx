import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'flat';
  noPadding?: boolean;
}

export function Card({ children, style, variant = 'elevated', noPadding = false }: CardProps) {
  const { colors, spacingMultiplier } = useTheme();

  const getBorderColor = () => {
    if (variant === 'outlined') return colors.cardBorder;
    return colors.border;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: getBorderColor(),
          borderWidth: 1,
          padding: noPadding ? 0 : 16 * spacingMultiplier,
          shadowColor: colors.text,
          shadowOpacity: variant === 'elevated' ? 0.05 : 0,
          elevation: variant === 'elevated' ? 2 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    marginBottom: 12,
  },
});
