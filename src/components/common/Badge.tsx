import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({
  label,
  variant = 'primary',
  size = 'small',
  style,
  textStyle,
}: BadgeProps) {
  const { colors, fontScale } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primaryLight, text: colors.primary };
      case 'success':
        return { bg: `${colors.success}1F`, text: colors.success };
      case 'warning':
        return { bg: `${colors.warning}1F`, text: colors.warning };
      case 'error':
        return { bg: `${colors.error}1F`, text: colors.error };
      case 'neutral':
      default:
        return { bg: colors.inputBg, text: colors.textSecondary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingVertical: size === 'small' ? 3 : 5,
          paddingHorizontal: size === 'small' ? 8 : 12,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize: (size === 'small' ? 11 : 13) * fontScale,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  text: {
    fontWeight: '600',
  },
});
