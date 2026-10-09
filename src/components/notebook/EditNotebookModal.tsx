import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Notebook } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '../common/Button';
import { Ionicons } from '@expo/vector-icons';
import { GLOBAL_ROOT_NOTEBOOK_ID, DEFAULT_NOTEBOOK_ID } from '@/constants/defaults';

interface EditNotebookModalProps {
  visible: boolean;
  notebook: Notebook | null;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
  onDelete?: (notebook: Notebook) => void;
}

export function EditNotebookModal({
  visible,
  notebook,
  onClose,
  onSave,
  onDelete,
}: EditNotebookModalProps) {
  const { colors, fontScale } = useTheme();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (notebook) {
      setName(notebook.name);
    }
  }, [notebook]);

  if (!notebook) return null;

  const isGlobal = notebook.id === GLOBAL_ROOT_NOTEBOOK_ID;
  const isDefault = notebook.id === DEFAULT_NOTEBOOK_ID;
  const isProtected = isGlobal || isDefault;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '分类名称不能为空');
      return;
    }
    setSaving(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch (e: any) {
      Alert.alert('修改失败', e?.message || '未知错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={isGlobal ? 'planet-outline' : notebook.children_type === 'notebook' ? 'folder' : 'book'}
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.title, { color: colors.text, fontSize: 16.5 * fontScale }]}>
                {isGlobal ? '查看分类信息' : '重命名/编辑笔记分类'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {isGlobal ? (
            <View style={styles.protectedNotice}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text style={[styles.protectedText, { color: colors.textSecondary, fontSize: 12.5 * fontScale }]}>
                「全部词汇」是系统的全局词库视图，包含所有已录入的英语词汇，无法重命名或删除。
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                分类名称
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="请输入笔记分类名称"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    fontSize: 14 * fontScale,
                  },
                ]}
                autoFocus
              />

              {isDefault ? (
                <View style={styles.defaultTip}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.defaultTipText, { color: colors.textMuted, fontSize: 11.5 * fontScale }]}>
                    系统默认笔记支持重命名，但不允许被删除。
                  </Text>
                </View>
              ) : null}
            </>
          )}

          {/* Stats info */}
          <View style={[styles.statsRow, { backgroundColor: colors.inputBg }]}>
            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: colors.text, fontSize: 14 * fontScale }]}>
                {notebook.vocabulary_ids?.length || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted, fontSize: 11 * fontScale }]}>
                收录词汇
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: colors.text, fontSize: 14 * fontScale }]}>
                {notebook.children_type === 'notebook' ? '嵌套子目录' : '词汇列表'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted, fontSize: 11 * fontScale }]}>
                节点类型
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            {!isProtected && onDelete ? (
              <Button
                title="删除分类"
                variant="outline"
                size="small"
                onPress={() => {
                  onClose();
                  onDelete(notebook);
                }}
                style={{ borderColor: colors.error, marginRight: 8 }}
                textStyle={{ color: colors.error }}
              />
            ) : null}

            <Button
              title="取消"
              variant="outline"
              size="small"
              onPress={onClose}
              style={{ flex: 1, marginRight: 8 }}
            />

            {!isGlobal ? (
              <Button
                title="保存修改"
                variant="primary"
                size="small"
                loading={saving}
                onPress={handleSave}
                style={{ flex: 1.2 }}
              />
            ) : (
              <Button
                title="确定"
                variant="primary"
                size="small"
                onPress={onClose}
                style={{ flex: 1 }}
              />
            )}
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
    maxWidth: 400,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontWeight: '700',
    marginLeft: 8,
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  protectedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    marginBottom: 12,
    gap: 8,
  },
  protectedText: {
    flex: 1,
    lineHeight: 18,
  },
  defaultTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  defaultTipText: {},
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
