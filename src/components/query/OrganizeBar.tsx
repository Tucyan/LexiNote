import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '../common/Button';
import { Ionicons } from '@expo/vector-icons';

interface OrganizeBarProps {
  onOrganizeDefault: () => void;
  onOrganizeCustom: () => void;
  disabled?: boolean;
}

export function OrganizeBar({
  onOrganizeDefault,
  onOrganizeCustom,
  disabled = false,
}: OrganizeBarProps) {
  const { colors, fontScale } = useTheme();
  const [isOrganizeMode, setIsOrganizeMode] = useState(false);

  if (!isOrganizeMode) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Button
          title="整理笔记"
          onPress={() => setIsOrganizeMode(true)}
          disabled={disabled}
          icon={<Ionicons name="create-outline" size={18} color="#FFFFFF" />}
          style={{ width: '100%' }}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View style={styles.organizeHeader}>
        <Text style={[styles.modeIndicator, { color: colors.primary, fontSize: 12 * fontScale }]}>
          ● 整理模式开启
        </Text>
        <TouchableOpacity
          style={styles.cancelModeBtn}
          onPress={() => setIsOrganizeMode(false)}
        >
          <Text style={[styles.cancelModeText, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
            退出整理
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="添加到默认笔记"
          variant="secondary"
          onPress={() => {
            onOrganizeDefault();
          }}
          disabled={disabled}
          icon={<Ionicons name="bookmark-outline" size={16} color={colors.primary} />}
          style={{ flex: 1, marginRight: 8 }}
        />
        <Button
          title="选择添加笔记"
          variant="primary"
          onPress={() => {
            onOrganizeCustom();
          }}
          disabled={disabled}
          icon={<Ionicons name="folder-outline" size={16} color="#FFFFFF" />}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  organizeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeIndicator: {
    fontWeight: '700',
  },
  cancelModeBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  cancelModeText: {
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
  },
});
