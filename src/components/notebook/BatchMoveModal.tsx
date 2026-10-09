import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Notebook } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '../common/Button';
import { Ionicons } from '@expo/vector-icons';
import { GLOBAL_ROOT_NOTEBOOK_ID } from '@/constants/defaults';

interface BatchMoveModalProps {
  visible: boolean;
  selectedCount: number;
  notebooks: Notebook[];
  currentNotebookId: string;
  onClose: () => void;
  onConfirm: (targetNotebookId: string) => Promise<void>;
}

export function BatchMoveModal({
  visible,
  selectedCount,
  notebooks,
  currentNotebookId,
  onClose,
  onConfirm,
}: BatchMoveModalProps) {
  const { colors, fontScale } = useTheme();
  const availableNotebooks = notebooks.filter(
    (n) => n.id !== GLOBAL_ROOT_NOTEBOOK_ID && n.id !== currentNotebookId
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    availableNotebooks[0]?.id || ''
  );
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedTargetId) return;
    setLoading(true);
    try {
      await onConfirm(selectedTargetId);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="folder-outline" size={20} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text, fontSize: 16.5 * fontScale }]}>
                批量归类到笔记
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.desc, { color: colors.textSecondary, fontSize: 12.5 * fontScale }]}>
            已选 {selectedCount} 个词汇，请选择要添加至的目标笔记分类：
          </Text>

          {availableNotebooks.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ color: colors.textMuted, fontSize: 13 * fontScale }}>
                暂无其他可选的笔记分类，请先新建分类。
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableNotebooks}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 220, marginVertical: 10 }}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedTargetId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.itemRow,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.inputBg,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedTargetId(item.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.itemName,
                        {
                          color: isSelected ? colors.primary : colors.text,
                          fontSize: 13.5 * fontScale,
                          fontWeight: isSelected ? '600' : 'normal',
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.itemCount, { color: colors.textMuted, fontSize: 12 * fontScale }]}>
                      ({item.vocabulary_ids?.length || 0} 词)
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <View style={styles.actionRow}>
            <Button
              title="取消"
              variant="outline"
              size="small"
              onPress={onClose}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="确认归类"
              variant="primary"
              size="small"
              disabled={!selectedTargetId}
              loading={loading}
              onPress={handleConfirm}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontWeight: '700',
    marginLeft: 6,
  },
  desc: {
    marginBottom: 6,
  },
  empty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  itemName: {
    flex: 1,
  },
  itemCount: {},
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
});
