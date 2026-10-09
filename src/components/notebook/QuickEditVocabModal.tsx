import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Vocabulary, Notebook, Meaning } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Ionicons } from '@expo/vector-icons';
import { GLOBAL_ROOT_NOTEBOOK_ID } from '@/constants/defaults';
import { generateId } from '@/utils/id';

interface QuickEditVocabModalProps {
  visible: boolean;
  vocabulary: Vocabulary | null;
  notebooks: Notebook[];
  onClose: () => void;
  onSave: (updatedVocab: Vocabulary, targetNotebookIds: string[]) => Promise<void>;
  onDelete?: (vocab: Vocabulary) => void;
}

export function QuickEditVocabModal({
  visible,
  vocabulary,
  notebooks,
  onClose,
  onSave,
  onDelete,
}: QuickEditVocabModalProps) {
  const { colors, fontScale } = useTheme();

  const [content, setContent] = useState('');
  const [type, setType] = useState<'word' | 'phrase'>('word');
  const [phonetic, setPhonetic] = useState('');
  const [pos, setPos] = useState('');
  const [zhDefinition, setZhDefinition] = useState('');
  const [enDefinition, setEnDefinition] = useState('');
  const [example, setExample] = useState('');
  const [remarks, setRemarks] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagText, setNewTagText] = useState('');
  const [selectedNotebookIds, setSelectedNotebookIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vocabulary) {
      setContent(vocabulary.content);
      setType(vocabulary.type);
      setTags(vocabulary.tags || []);

      const primary = vocabulary.meanings[0];
      setPhonetic(primary?.phonetic || '');
      setPos(primary?.part_of_speech || '');
      setZhDefinition(primary?.zh_definition || '');
      setEnDefinition(primary?.en_definition || '');
      setExample(primary?.example || '');
      setRemarks(primary?.remarks || '');

      // Identify which notebooks currently contain this vocabulary
      const assigned = notebooks
        .filter((n) => n.id !== GLOBAL_ROOT_NOTEBOOK_ID && n.vocabulary_ids.includes(vocabulary.id))
        .map((n) => n.id);
      setSelectedNotebookIds(assigned);
    }
  }, [vocabulary, notebooks]);

  if (!vocabulary) return null;

  const handleAddTag = () => {
    const t = newTagText.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setNewTagText('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const toggleNotebook = (nbId: string) => {
    if (selectedNotebookIds.includes(nbId)) {
      if (selectedNotebookIds.length <= 1) {
        Alert.alert('提示', '词汇必须至少属于一个自定义笔记分类');
        return;
      }
      setSelectedNotebookIds(selectedNotebookIds.filter((id) => id !== nbId));
    } else {
      setSelectedNotebookIds([...selectedNotebookIds, nbId]);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '词汇文本内容不能为空');
      return;
    }
    if (!zhDefinition.trim() && !enDefinition.trim()) {
      Alert.alert('提示', '中文释义或英文释义至少填写一项');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const existingMeanings = [...vocabulary.meanings];
      const updatedPrimary: Meaning = {
        ...(existingMeanings[0] || {
          id: generateId('m'),
          created_at: now,
          updated_at: now,
        }),
        phonetic: phonetic.trim() || undefined,
        part_of_speech: pos.trim() || undefined,
        zh_definition: zhDefinition.trim() || undefined,
        en_definition: enDefinition.trim() || undefined,
        example: example.trim() || undefined,
        remarks: remarks.trim() || undefined,
        updated_at: now,
      };

      const updatedMeanings = [
        updatedPrimary,
        ...existingMeanings.slice(1),
      ];

      const updatedVocab: Vocabulary = {
        ...vocabulary,
        content: content.trim(),
        type,
        tags,
        meanings: updatedMeanings,
        updated_at: now,
      };

      await onSave(updatedVocab, selectedNotebookIds);
      onClose();
    } catch (e: any) {
      Alert.alert('保存失败', e?.message || '未知错误');
    } finally {
      setSaving(false);
    }
  };

  const customNotebooks = notebooks.filter((n) => n.id !== GLOBAL_ROOT_NOTEBOOK_ID);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text, fontSize: 17 * fontScale }]}>
                编辑词汇条目
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 1. Word text & Type */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
              词汇原文与类型
            </Text>
            <View style={styles.wordRow}>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="单词或短语拼写"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    flex: 1,
                    color: colors.text,
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    fontSize: 16 * fontScale,
                    fontWeight: '600',
                  },
                ]}
              />
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    type === 'word' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                  ]}
                  onPress={() => setType('word')}
                >
                  <Text style={{ color: type === 'word' ? colors.primary : colors.textSecondary, fontSize: 12 * fontScale, fontWeight: '600' }}>
                    单词
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    type === 'phrase' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                  ]}
                  onPress={() => setType('phrase')}
                >
                  <Text style={{ color: type === 'phrase' ? colors.primary : colors.textSecondary, fontSize: 12 * fontScale, fontWeight: '600' }}>
                    短语
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Phonetic & POS */}
            <View style={styles.rowTwo}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 11.5 * fontScale }]}>
                  音标
                </Text>
                <TextInput
                  value={phonetic}
                  onChangeText={setPhonetic}
                  placeholder="如 /həˈləʊ/"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 11.5 * fontScale }]}>
                  词性
                </Text>
                <TextInput
                  value={pos}
                  onChangeText={setPos}
                  placeholder="如 n. / v. / adj."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                />
              </View>
            </View>

            {/* 3. Definitions */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 11.5 * fontScale, marginTop: 8 }]}>
              中文释义 (必选之一)
            </Text>
            <TextInput
              value={zhDefinition}
              onChangeText={setZhDefinition}
              placeholder="中文释义"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 11.5 * fontScale, marginTop: 8 }]}>
              英文释义 (可选)
            </Text>
            <TextInput
              value={enDefinition}
              onChangeText={setEnDefinition}
              placeholder="English Definition"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
            />

            {/* 4. Example */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 11.5 * fontScale, marginTop: 8 }]}>
              例句
            </Text>
            <TextInput
              value={example}
              onChangeText={setExample}
              placeholder="例句及语境..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
              style={[
                styles.input,
                { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border, minHeight: 52 },
              ]}
            />

            {/* 5. Remarks */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 11.5 * fontScale, marginTop: 8 }]}>
              个人备注
            </Text>
            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              placeholder="记忆技巧、用法辨析..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
            />

            {/* 6. Tags */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 11.5 * fontScale, marginTop: 8 }]}>
              标签分类
            </Text>
            <View style={styles.tagWrap}>
              {tags.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tagPill, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  onPress={() => handleRemoveTag(t)}
                >
                  <Text style={[styles.tagPillText, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>
                    #{t}
                  </Text>
                  <Ionicons name="close-circle" size={12} color={colors.textMuted} style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.addTagRow}>
              <TextInput
                value={newTagText}
                onChangeText={setNewTagText}
                placeholder="新标签名称"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.tagInput,
                  { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
                onSubmitEditing={handleAddTag}
              />
              <TouchableOpacity
                style={[styles.addTagBtn, { backgroundColor: colors.primaryLight }]}
                onPress={handleAddTag}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12 * fontScale, fontWeight: '600' }}>
                  添加
                </Text>
              </TouchableOpacity>
            </View>

            {/* 7. Notebook assignments */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 11.5 * fontScale, marginTop: 12 }]}>
              归属笔记分类 (可多选勾选)
            </Text>
            <View style={styles.nbWrap}>
              {customNotebooks.map((nb) => {
                const checked = selectedNotebookIds.includes(nb.id);
                return (
                  <TouchableOpacity
                    key={nb.id}
                    style={[
                      styles.nbPill,
                      {
                        backgroundColor: checked ? colors.primaryLight : colors.inputBg,
                        borderColor: checked ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => toggleNotebook(nb.id)}
                  >
                    <Ionicons
                      name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={checked ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.nbPillText,
                        {
                          color: checked ? colors.primary : colors.textSecondary,
                          fontSize: 12 * fontScale,
                          fontWeight: checked ? '600' : 'normal',
                        },
                      ]}
                    >
                      {nb.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {onDelete ? (
              <Button
                title="删除词汇"
                variant="outline"
                size="small"
                onPress={() => {
                  onClose();
                  onDelete(vocabulary);
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
            <Button
              title="保存修改"
              variant="primary"
              size="small"
              loading={saving}
              onPress={handleSave}
              style={{ flex: 1.3 }}
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
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontWeight: '700',
    marginLeft: 6,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontWeight: '700',
    marginBottom: 6,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  typeToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowTwo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagPillText: {},
  addTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  nbWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  nbPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  nbPillText: {},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
  },
});
