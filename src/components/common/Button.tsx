import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, fontScale, spacingMultiplier } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.divider;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.primaryLight;
      case 'outline':
      case 'ghost':
        return 'transparent';
      case 'danger':
        return colors.error;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
      case 'ghost':
        return colors.primary;
      case 'outline':
        return colors.text;
      case 'danger':
        return '#FFFFFF';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 6 * spacingMultiplier,
          paddingHorizontal: 12 * spacingMultiplier,
        };
      case 'large':
        return {
          paddingVertical: 14 * spacingMultiplier,
          paddingHorizontal: 24 * spacingMultiplier,
        };
      default:
        return {
          paddingVertical: 10 * spacingMultiplier,
          paddingHorizontal: 16 * spacingMultiplier,
        };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 13 * fontScale;
      case 'large':
        return 16 * fontScale;
      default:
        return 14 * fontScale;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        getPadding(),
        {
          backgroundColor: getBackgroundColor(),
          borderColor: variant === 'outline' ? colors.border : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.primary}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                marginLeft: icon ? 6 : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
