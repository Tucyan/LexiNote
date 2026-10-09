import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  clearable?: boolean;
  onClear?: () => void;
  prefixIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  clearable = false,
  onClear,
  prefixIcon,
  value,
  style,
  ...props
}: InputProps) {
  const { colors, fontScale, spacingMultiplier } = useTheme();

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.inputBg,
            borderColor: error ? colors.error : colors.border,
            paddingHorizontal: 12 * spacingMultiplier,
          },
        ]}
      >
        {prefixIcon ? <View style={styles.prefix}>{prefixIcon}</View> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          value={value}
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: 15 * fontScale,
              paddingVertical: 10 * spacingMultiplier,
            },
            style,
          ]}
          {...props}
        />
        {clearable && value && value.length > 0 ? (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.error, fontSize: 12 * fontScale }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  prefix: {
    marginRight: 8,
  },
  input: {
    flex: 1,
  },
  error: {
    marginTop: 4,
  },
});
