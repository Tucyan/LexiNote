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
  saveToDefaultOnly?: boolean;
}

export function OrganizeModal({
  visible,
  result,
  notebooks,
  onClose,
  onConfirmSave,
  saveToDefaultOnly = false,
}: OrganizeModalProps) {
  const { colors, fontScale } = useTheme();
  const { settings } = useSettings();

  // Field selections
  const [fields, setFields] = useState<SaveFieldSelection>({
    ...settings.default_fields_to_save,
    zh_definition: true, // mandatory
  });

  // Editable meanings
  const [draftMeanings, setDraftMeanings] = useState<QueryMeaningDraft[]>(
    result.meanings.map((m) => ({ ...m, selected: m.selected !== false }))
  );

  // Target notebooks (filtered to exclude global root as it is auto-synced)
  const availableNotebooks = notebooks.filter((n) => n.id !== GLOBAL_ROOT_NOTEBOOK_ID);
  const [targetNotebookIds, setTargetNotebookIds] = useState<string[]>([
    settings.default_notebook_id || (availableNotebooks[0]?.id ?? 'nb_default'),
  ]);

  // Optional custom annotation / remark
  const [customAnnotation, setCustomAnnotation] = useState('');

  const toggleField = (key: keyof SaveFieldSelection) => {
    if (key === 'zh_definition') {
      // Mandatory per PRD
      Alert.alert('提示', '释义为必填项，无法取消勾选');
      return;
    }
    setFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMeaningSelected = (index: number) => {
    setDraftMeanings((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return updated;
    });
  };

  const updateMeaningField = (index: number, key: keyof QueryMeaningDraft, val: string) => {
    setDraftMeanings((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: val };
      return updated;
    });
  };

  const toggleNotebook = (id: string) => {
    if (targetNotebookIds.includes(id)) {
      if (targetNotebookIds.length === 1) {
        Alert.alert('提示', '至少选择一个保存的笔记分类');
        return;
      }
      setTargetNotebookIds(targetNotebookIds.filter((nid) => nid !== id));
    } else {
      setTargetNotebookIds([...targetNotebookIds, id]);
    }
  };

  const handleSave = () => {
    const selectedMeanings = draftMeanings.filter((m) => m.selected);
    if (selectedMeanings.length === 0) {
      Alert.alert('提示', '请至少勾选一条要保存的释义');
      return;
    }

    onConfirmSave({
      word: result.word,
      meanings: selectedMeanings,
      selectedFields: fields,
      targetNotebookIds,
      userAnnotation: customAnnotation.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.text, fontSize: 18 * fontScale }]}>
                整理与保存笔记
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                自主勾选待存字段，可自由补充编辑
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Word Preview */}
            <Card variant="flat" style={{ backgroundColor: colors.inputBg, marginBottom: 12 }}>
              <Text style={[styles.wordLabel, { color: colors.primary, fontSize: 18 * fontScale }]}>
                {result.word}
              </Text>
              {result.phonetic ? (
                <Text style={[styles.phoneticLabel, { color: colors.textSecondary }]}>
                  {result.phonetic}
                </Text>
              ) : null}
            </Card>

            {/* Field Toggles Section */}
            <Text style={[styles.sectionHeading, { color: colors.text, fontSize: 14 * fontScale }]}>
              1. 勾选保存字段
            </Text>
            <View style={styles.fieldsGrid}>
              {[
                { key: 'zh_definition', label: '中文释义 (必选)', mandatory: true },
                { key: 'en_definition', label: '英文释义' },
                { key: 'phonetic', label: '国际音标' },
                { key: 'example', label: '典型例句' },
                { key: 'source', label: '来源片段' },
                { key: 'remarks', label: 'AI备注' },
                { key: 'annotations', label: '批注信息' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.fieldCheckbox,
                    {
                      backgroundColor: fields[item.key as keyof SaveFieldSelection]
                        ? colors.primaryLight
                        : colors.inputBg,
                      borderColor: fields[item.key as keyof SaveFieldSelection]
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                  onPress={() => toggleField(item.key as keyof SaveFieldSelection)}
                >
                  <Ionicons
                    name={
                      fields[item.key as keyof SaveFieldSelection]
                        ? 'checkbox'
                        : 'square-outline'
                    }
                    size={16}
                    color={
                      fields[item.key as keyof SaveFieldSelection]
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.fieldCheckText,
                      {
                        color: fields[item.key as keyof SaveFieldSelection]
                          ? colors.primary
                          : colors.textSecondary,
                        fontSize: 12 * fontScale,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Meanings Selection & Editing */}
            <Text style={[styles.sectionHeading, { color: colors.text, fontSize: 14 * fontScale, marginTop: 16 }]}>
              2. 释义选择与修改 (共 {draftMeanings.length} 条)
            </Text>
            {draftMeanings.map((m, idx) => (
              <Card
                key={m.id || idx}
                variant="outlined"
                style={{
                  marginBottom: 10,
                  borderColor: m.selected ? colors.primary : colors.border,
                }}
              >
                <View style={styles.meaningCardHeader}>
                  <TouchableOpacity
                    style={styles.meaningCheckboxRow}
                    onPress={() => toggleMeaningSelected(idx)}
                  >
                    <Ionicons
                      name={m.selected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={m.selected ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.meaningSelectLabel,
                        {
                          color: m.selected ? colors.primary : colors.textMuted,
                          fontSize: 13 * fontScale,
                        },
                      ]}
                    >
                      释义项 {idx + 1} {m.part_of_speech ? `(${m.part_of_speech})` : ''}
                    </Text>
                  </TouchableOpacity>
                </View>

                {m.selected ? (
                  <View style={{ marginTop: 8 }}>
                    <TextInput
                      value={m.zh_definition}
                      onChangeText={(t) => updateMeaningField(idx, 'zh_definition', t)}
                      placeholder="中文释义"
                      placeholderTextColor={colors.textMuted}
                      style={[
                        styles.fieldInput,
                        {
                          color: colors.text,
                          backgroundColor: colors.inputBg,
                          borderColor: colors.border,
                        },
                      ]}
                    />

                    {fields.en_definition ? (
                      <TextInput
                        value={m.en_definition}
                        onChangeText={(t) => updateMeaningField(idx, 'en_definition', t)}
                        placeholder="英文释义"
                        placeholderTextColor={colors.textMuted}
                        style={[
                          styles.fieldInput,
                          {
                            color: colors.text,
                            backgroundColor: colors.inputBg,
                            borderColor: colors.border,
                            marginTop: 6,
                          },
                        ]}
                      />
                    ) : null}

                    {fields.example ? (
                      <TextInput
                        value={m.example}
                        onChangeText={(t) => updateMeaningField(idx, 'example', t)}
                        placeholder="例句"
                        placeholderTextColor={colors.textMuted}
                        style={[
                          styles.fieldInput,
                          {
                            color: colors.text,
                            backgroundColor: colors.inputBg,
                            borderColor: colors.border,
                            marginTop: 6,
                          },
                        ]}
                      />
                    ) : null}
                  </View>
                ) : null}
              </Card>
            ))}

            {/* Custom Annotation / Note */}
            <Text style={[styles.sectionHeading, { color: colors.text, fontSize: 14 * fontScale, marginTop: 14 }]}>
              3. 自定义个人批注 / 备注
            </Text>
            <TextInput
              value={customAnnotation}
              onChangeText={setCustomAnnotation}
              placeholder="添加你对该词的记忆口诀、使用心得或特殊语境批注..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              style={[
                styles.textArea,
                {
                  color: colors.text,
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            />

            {/* Notebook Destination */}
            {!saveToDefaultOnly && (
              <>
                <Text style={[styles.sectionHeading, { color: colors.text, fontSize: 14 * fontScale, marginTop: 16 }]}>
                  4. 保存目标笔记分类
                </Text>
                <View style={styles.notebookChipContainer}>
                  {availableNotebooks.map((nb) => {
                    const isSelected = targetNotebookIds.includes(nb.id);
                    return (
                      <TouchableOpacity
                        key={nb.id}
                        style={[
                          styles.notebookChip,
                          {
                            backgroundColor: isSelected ? colors.primaryLight : colors.inputBg,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => toggleNotebook(nb.id)}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'book-outline'}
                          size={15}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.notebookChipText,
                            {
                              color: isSelected ? colors.primary : colors.textSecondary,
                              fontSize: 12 * fontScale,
                            },
                          ]}
                        >
                          {nb.name} {nb.is_default ? '(默认)' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Button
              title="取消"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: 10 }}
            />
            <Button
              title="确认保存到词库"
              variant="primary"
              onPress={handleSave}
              style={{ flex: 2 }}
              icon={<Ionicons name="checkmark-done" size={16} color="#FFFFFF" />}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    minHeight: '65%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    padding: 16,
  },
  wordLabel: {
    fontWeight: '800',
  },
  phoneticLabel: {
    marginTop: 2,
    fontFamily: 'monospace',
  },
  sectionHeading: {
    fontWeight: '700',
    marginBottom: 8,
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  fieldCheckText: {
    marginLeft: 6,
    fontWeight: '600',
  },
  meaningCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meaningCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meaningSelectLabel: {
    marginLeft: 8,
    fontWeight: '700',
  },
  fieldInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  notebookChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  notebookChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  notebookChipText: {
    marginLeft: 6,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
});
