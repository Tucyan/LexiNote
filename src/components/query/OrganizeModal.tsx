import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { QueryResult, Notebook, SaveFieldSelection, QueryMeaningDraft } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { Button } from '../common/Button';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { GLOBAL_ROOT_NOTEBOOK_ID } from '@/constants/defaults';

interface OrganizeModalProps {
  visible: boolean;
  result: QueryResult;
  notebooks: Notebook[];
  onClose: () => void;
  onConfirmSave: (data: {
    word: string;
    meanings: QueryMeaningDraft[];
    selectedFields: SaveFieldSelection;
    targetNotebookIds: string[];
    userAnnotation?: string;
  }) => void;
}

export function OrganizeModal({
  visible,
  result,
  notebooks,
  onClose,
  onConfirmSave,
}: OrganizeModalProps) {
  const { colors, fontScale } = useTheme();
  const { settings } = useSettings();

  // Target notebooks (filtered to exclude global root)
  const availableNotebooks = notebooks.filter((n) => n.id !== GLOBAL_ROOT_NOTEBOOK_ID);
  const [targetNotebookIds, setTargetNotebookIds] = useState<string[]>([
    settings.default_notebook_id || (availableNotebooks[0]?.id ?? 'nb_default'),
  ]);

  // Optional custom annotation / remark
  const [customAnnotation, setCustomAnnotation] = useState('');

  const toggleNotebook = (id: string) => {
    if (targetNotebookIds.includes(id)) {
      if (targetNotebookIds.length === 1) {
        Alert.alert('提示', '至少需选择一个目标笔记本');
        return;
      }
      setTargetNotebookIds(targetNotebookIds.filter((nid) => nid !== id));
    } else {
      setTargetNotebookIds([...targetNotebookIds, id]);
    }
  };

  const selectedMeanings = result.meanings.filter((m) => m.selected !== false);

  const handleSave = () => {
    if (selectedMeanings.length === 0) {
      Alert.alert('提示', '请在查看页面至少勾选保留一条释义');
      return;
    }

    if (targetNotebookIds.length === 0) {
      Alert.alert('提示', '请选择至少一个目标笔记分类');
      return;
    }

    // Process definitions according to user's direct choice on the view page (中英文二选一)
    const finalizedMeanings: QueryMeaningDraft[] = selectedMeanings.map((m) => {
      const choice = m.definition_choice || 'zh';
      return {
        ...m,
        zh_definition: choice === 'en' ? '' : m.zh_definition,
        en_definition: choice === 'zh' ? '' : m.en_definition,
      };
    });

    onConfirmSave({
      word: result.word,
      meanings: finalizedMeanings,
      selectedFields: {
        zh_definition: true,
        en_definition: true,
        phonetic: !!result.phonetic,
        example: true,
        source: true,
        source_images: true,
        annotations: !!customAnnotation.trim(),
        remarks: true,
      },
      targetNotebookIds,
      userAnnotation: customAnnotation.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.text, fontSize: 17 * fontScale }]}>
                选择存入笔记本
              </Text>
              <Text style={[styles.subTitle, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                目标词汇：「{result.word}」 · 已选 {selectedMeanings.length} 条释义
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ padding: 16 }}>
            {/* Notebook Selector */}
            <Text style={[styles.sectionHeading, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
              目标分类笔记本
            </Text>

            <View style={styles.notebookGrid}>
              {availableNotebooks.map((nb) => {
                const isChecked = targetNotebookIds.includes(nb.id);
                return (
                  <TouchableOpacity
                    key={nb.id}
                    style={[
                      styles.notebookItem,
                      isChecked
                        ? {
                            backgroundColor: colors.primaryLight + '25',
                            borderColor: colors.primary,
                            borderWidth: 1.5,
                          }
                        : {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.border,
                            borderWidth: 1,
                          },
                    ]}
                    onPress={() => toggleNotebook(nb.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={isChecked ? colors.primary : colors.textTertiary}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.notebookName,
                        {
                          color: isChecked ? colors.primary : colors.text,
                          fontWeight: isChecked ? '700' : '500',
                          fontSize: 13.5 * fontScale,
                        },
                      ]}
                    >
                      {nb.name}
                    </Text>
                    {nb.id === settings.default_notebook_id ? (
                      <View style={[styles.defaultBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.defaultBadgeText, { color: colors.primary, fontSize: 10 * fontScale }]}>
                          默认
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Optional Personal Note / Remark */}
            <Text style={[styles.sectionHeading, { color: colors.textSecondary, fontSize: 13 * fontScale, marginTop: 16 }]}>
              添加个性批注 / 备忘（可选）
            </Text>
            <TextInput
              style={[
                styles.annotationInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                  fontSize: 13.5 * fontScale,
                },
              ]}
              placeholder="例如：在某篇论文阅读时遇到的高频考点..."
              placeholderTextColor={colors.textTertiary}
              value={customAnnotation}
              onChangeText={setCustomAnnotation}
              multiline
              numberOfLines={2}
            />
          </ScrollView>

          {/* Bottom Confirmation Bar */}
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <Button title="取消" variant="outline" onPress={onClose} style={{ flex: 1, marginRight: 10 }} />
            <Button
              title={`确定保存 (${selectedMeanings.length} 条释义)`}
              variant="primary"
              onPress={handleSave}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '62%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: '700',
  },
  subTitle: {
    marginTop: 3,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  sectionHeading: {
    fontWeight: '700',
    marginBottom: 8,
  },
  notebookGrid: {
    gap: 8,
  },
  notebookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  notebookName: {
    flex: 1,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  defaultBadgeText: {
    fontWeight: '700',
  },
  annotationInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    height: 70,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
  },
});
