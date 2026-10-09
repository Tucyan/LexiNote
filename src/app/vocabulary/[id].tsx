import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useNotebooks } from '@/context/NotebookContext';
import { Meaning } from '@/types';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { AnnotationModal } from '@/components/notebook/AnnotationModal';
import { Ionicons } from '@expo/vector-icons';
import { generateId } from '@/utils/id';
import { GLOBAL_ROOT_NOTEBOOK_ID } from '@/constants/defaults';

export default function VocabularyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, fontScale } = useTheme();
  const {
    vocabularies,
    notebooks,
    updateMeaning,
    deleteMeaning,
    addMeaningToVocabulary,
    addAnnotation,
    deleteAnnotation,
    saveVocabulary,
  } = useNotebooks();

  const vocab = vocabularies[id || ''];

  // State for adding tag
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // State for adding/editing meaning
  const [editingMeaningId, setEditingMeaningId] = useState<string | null>(null);
  const [meaningZhInput, setMeaningZhInput] = useState('');
  const [meaningEnInput, setMeaningEnInput] = useState('');
  const [meaningExampleInput, setMeaningExampleInput] = useState('');
  const [meaningRemarksInput, setMeaningRemarksInput] = useState('');
  const [meaningPosInput, setMeaningPosInput] = useState('');

  // Annotation modal state
  const [annotationModalTarget, setAnnotationModalTarget] = useState<string | null>(null);

  // Notebooks referencing this vocab
  const referencingNotebooks = useMemo(() => {
    if (!vocab) return [];
    return notebooks.filter(
      (nb) => nb.id !== GLOBAL_ROOT_NOTEBOOK_ID && nb.vocabulary_ids.includes(vocab.id)
    );
  }, [notebooks, vocab]);

  if (!vocab) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
          词汇不存在或已被删除
        </Text>
        <Button title="返回笔记" onPress={() => router.back()} style={{ marginTop: 14 }} />
      </View>
    );
  }

  const handleStartEditMeaning = (m: Meaning) => {
    setEditingMeaningId(m.id);
    setMeaningZhInput(m.zh_definition || '');
    setMeaningEnInput(m.en_definition || '');
    setMeaningExampleInput(m.example || '');
    setMeaningRemarksInput(m.remarks || '');
    setMeaningPosInput(m.part_of_speech || '');
  };

  const handleSaveMeaningEdit = async () => {
    if (!editingMeaningId) return;
    if (!meaningZhInput.trim() && !meaningEnInput.trim()) {
      Alert.alert('提示', '中文释义或英文释义至少填写一项');
      return;
    }

    const original = vocab.meanings.find((m) => m.id === editingMeaningId);
    if (!original) return;

    await updateMeaning(vocab.id, {
      ...original,
      zh_definition: meaningZhInput.trim() || undefined,
      en_definition: meaningEnInput.trim() || undefined,
      example: meaningExampleInput.trim() || undefined,
      remarks: meaningRemarksInput.trim() || undefined,
      part_of_speech: meaningPosInput.trim() || undefined,
      updated_at: new Date().toISOString(),
    });

    setEditingMeaningId(null);
  };

  const handleAddNewMeaning = async () => {
    const newM: Meaning = {
      id: generateId('m'),
      zh_definition: '新释义',
      en_definition: 'New definition',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await addMeaningToVocabulary(vocab.id, newM);
    handleStartEditMeaning(newM);
  };

  const handleDeleteMeaning = (mId: string) => {
    if (vocab.meanings.length <= 1) {
      Alert.alert('提示', '词汇必须至少保留一条含义');
      return;
    }
    Alert.alert('删除释义', '确定删除该条释义记录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteMeaning(vocab.id, mId) },
    ]);
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim();
    const updatedTags = Array.from(new Set([...(vocab.tags || []), tag]));
    await saveVocabulary({
      ...vocab,
      tags: updatedTags,
    });
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = (vocab.tags || []).filter((t) => t !== tagToRemove);
    await saveVocabulary({
      ...vocab,
      tags: updatedTags,
    });
  };

  const toggleNotebookAssignment = async (nbId: string) => {
    const isCurrentlyIncluded = vocab && notebooks.find((n) => n.id === nbId)?.vocabulary_ids.includes(vocab.id);
    let updatedTargets: string[];
    if (isCurrentlyIncluded) {
      if (referencingNotebooks.length <= 1) {
        Alert.alert('提示', '词汇必须至少归属于一个自定义笔记分类');
        return;
      }
      updatedTargets = referencingNotebooks.filter((n) => n.id !== nbId).map((n) => n.id);
    } else {
      updatedTargets = [...referencingNotebooks.map((n) => n.id), nbId];
    }

    await saveVocabulary(
      { ...vocab },
      { targetNotebookIds: updatedTargets, mergeExisting: true }
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      {/* Word Header Card */}
      <Card variant="elevated">
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.wordTitle, { color: colors.text, fontSize: 26 * fontScale }]}>
              {vocab.content}
            </Text>
            {vocab.meanings[0]?.phonetic ? (
              <Text style={[styles.phoneticText, { color: colors.textSecondary, fontSize: 15 * fontScale }]}>
                {vocab.meanings[0].phonetic}
              </Text>
            ) : null}
          </View>
          <Badge
            label={vocab.type === 'phrase' ? '短语' : '单词'}
            variant="primary"
            size="medium"
          />
        </View>

        {/* Tags */}
        <View style={styles.tagSection}>
          <Text style={[styles.subHeading, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
            标签归类：
          </Text>
          <View style={styles.tagRow}>
            {vocab.tags?.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagPill, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => handleRemoveTag(tag)}
              >
                <Text style={[styles.tagText, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                  #{tag}
                </Text>
                <Ionicons name="close-circle" size={13} color={colors.textMuted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}

            {isAddingTag ? (
              <View style={styles.newTagInputRow}>
                <TextInput
                  value={newTagInput}
                  onChangeText={setNewTagInput}
                  placeholder="标签名"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  style={[
                    styles.tagInput,
                    { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.primary },
                  ]}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity onPress={handleAddTag} style={{ marginLeft: 4 }}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addTagBtn, { borderColor: colors.border }]}
                onPress={() => setIsAddingTag(true)}
              >
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={[styles.addTagText, { color: colors.primary, fontSize: 11.5 * fontScale }]}>
                  添加标签
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Belonging Notebooks (Multi-notebook references) */}
        <View style={styles.notebookSection}>
          <Text style={[styles.subHeading, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
            归属笔记分类（支持多重引用）：
          </Text>
          <View style={styles.notebookChipRow}>
            {notebooks
              .filter((n) => n.id !== GLOBAL_ROOT_NOTEBOOK_ID)
              .map((nb) => {
                const isIncluded = nb.vocabulary_ids.includes(vocab.id);
                return (
                  <TouchableOpacity
                    key={nb.id}
                    style={[
                      styles.notebookPill,
                      {
                        backgroundColor: isIncluded ? colors.primaryLight : colors.inputBg,
                        borderColor: isIncluded ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => toggleNotebookAssignment(nb.id)}
                  >
                    <Ionicons
                      name={isIncluded ? 'checkmark-circle' : 'add-circle-outline'}
                      size={14}
                      color={isIncluded ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.notebookPillText,
                        {
                          color: isIncluded ? colors.primary : colors.textSecondary,
                          fontSize: 12 * fontScale,
                        },
                      ]}
                    >
                      {nb.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      </Card>

      {/* Meanings & Annotations */}
      <View style={styles.meaningsHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 * fontScale }]}>
          释义与详细批注 ({vocab.meanings.length})
        </Text>
        <TouchableOpacity
          style={[styles.addMeaningBtn, { backgroundColor: colors.primaryLight }]}
          onPress={handleAddNewMeaning}
        >
          <Ionicons name="add" size={15} color={colors.primary} />
          <Text style={[styles.addMeaningText, { color: colors.primary, fontSize: 12 * fontScale }]}>
            新增释义
          </Text>
        </TouchableOpacity>
      </View>

      {vocab.meanings.map((meaning, index) => {
        const isEditing = editingMeaningId === meaning.id;
        return (
          <Card key={meaning.id} variant="outlined" style={styles.meaningCard}>
            <View style={styles.meaningTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.indexBubble, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.indexText, { color: colors.primary, fontSize: 12 * fontScale }]}>
                    {index + 1}
                  </Text>
                </View>
                {meaning.part_of_speech ? (
                  <Badge label={meaning.part_of_speech} variant="primary" style={{ marginLeft: 6 }} />
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => (isEditing ? handleSaveMeaningEdit() : handleStartEditMeaning(meaning))}
                  style={styles.actionIconBtn}
                >
                  <Ionicons
                    name={isEditing ? 'checkmark-circle' : 'create-outline'}
                    size={18}
                    color={isEditing ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteMeaning(meaning.id)}
                  style={styles.actionIconBtn}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>

            {isEditing ? (
              <View style={styles.editMeaningForm}>
                <TextInput
                  value={meaningPosInput}
                  onChangeText={setMeaningPosInput}
                  placeholder="词性 (如 n., v., adj.)"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.formInput,
                    { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border },
                  ]}
                />
                <TextInput
                  value={meaningZhInput}
                  onChangeText={setMeaningZhInput}
                  placeholder="中文释义"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.formInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                      marginTop: 6,
                    },
                  ]}
                />
                <TextInput
                  value={meaningEnInput}
                  onChangeText={setMeaningEnInput}
                  placeholder="英文释义"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.formInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                      marginTop: 6,
                    },
                  ]}
                />
                <TextInput
                  value={meaningExampleInput}
                  onChangeText={setMeaningExampleInput}
                  placeholder="例句"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.formInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                      marginTop: 6,
                    },
                  ]}
                />
                <TextInput
                  value={meaningRemarksInput}
                  onChangeText={setMeaningRemarksInput}
                  placeholder="备注与辨析"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.formInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                      marginTop: 6,
                    },
                  ]}
                />
                <Button
                  title="完成编辑"
                  size="small"
                  variant="primary"
                  onPress={handleSaveMeaningEdit}
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : (
              <View style={{ marginTop: 4 }}>
                {meaning.zh_definition ? (
                  <Text style={[styles.meaningZh, { color: colors.text, fontSize: 15 * fontScale }]}>
                    {meaning.zh_definition}
                  </Text>
                ) : null}
                {meaning.en_definition ? (
                  <Text style={[styles.meaningEn, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
                    {meaning.en_definition}
                  </Text>
                ) : null}
                {meaning.example ? (
                  <View style={[styles.exampleBox, { backgroundColor: colors.inputBg, borderLeftColor: colors.primary }]}>
                    <Text style={[styles.exampleText, { color: colors.text, fontSize: 13 * fontScale }]}>
                      "{meaning.example}"
                    </Text>
                  </View>
                ) : null}
                {meaning.remarks ? (
                  <Text style={[styles.remarksText, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                    备注: {meaning.remarks}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Annotations List */}
            <View style={[styles.annotationsContainer, { borderTopColor: colors.border }]}>
              <View style={styles.annoHeaderRow}>
                <Text style={[styles.annoTitle, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                  定向批注 ({meaning.annotations?.length || 0})
                </Text>
                <TouchableOpacity
                  style={styles.addAnnoLink}
                  onPress={() => setAnnotationModalTarget(meaning.id)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.primary} />
                  <Text style={[styles.addAnnoLinkText, { color: colors.primary, fontSize: 11.5 * fontScale }]}>
                    添加批注
                  </Text>
                </TouchableOpacity>
              </View>

              {meaning.annotations?.map((anno) => (
                <View key={anno.id} style={[styles.annoItem, { backgroundColor: colors.inputBg }]}>
                  <View style={{ flex: 1 }}>
                    {anno.target_text ? (
                      <Text style={[styles.annoTarget, { color: colors.primary, fontSize: 11 * fontScale }]}>
                        目标片段："{anno.target_text}"
                      </Text>
                    ) : null}
                    <Text style={[styles.annoContent, { color: colors.text, fontSize: 12.5 * fontScale }]}>
                      {anno.content}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteAnnotation(vocab.id, meaning.id, anno.id)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </Card>
        );
      })}

      {/* Annotation Modal */}
      {annotationModalTarget && (
        <AnnotationModal
          visible={!!annotationModalTarget}
          meaningId={annotationModalTarget}
          onClose={() => setAnnotationModalTarget(null)}
          onSave={async (data) => {
            await addAnnotation(vocab.id, annotationModalTarget, {
              ...data,
              meaning_id: annotationModalTarget,
            });
            setAnnotationModalTarget(null);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    marginTop: 10,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  wordTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  phoneticText: {
    fontFamily: 'monospace',
    marginTop: 4,
  },
  tagSection: {
    marginTop: 14,
  },
  subHeading: {
    fontWeight: '600',
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: {
    fontWeight: '600',
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addTagText: {
    fontWeight: '600',
    marginLeft: 3,
  },
  newTagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    width: 80,
  },
  notebookSection: {
    marginTop: 14,
  },
  notebookChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  notebookPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  notebookPillText: {
    fontWeight: '600',
    marginLeft: 4,
  },
  meaningsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  addMeaningBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addMeaningText: {
    fontWeight: '700',
    marginLeft: 3,
  },
  meaningCard: {
    marginBottom: 12,
    padding: 14,
  },
  meaningTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indexBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontWeight: '700',
  },
  actionIconBtn: {
    padding: 4,
    marginLeft: 8,
  },
  editMeaningForm: {
    marginTop: 8,
  },
  formInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  meaningZh: {
    fontWeight: '700',
    lineHeight: 22,
  },
  meaningEn: {
    marginTop: 4,
    lineHeight: 18,
  },
  exampleBox: {
    borderLeftWidth: 3,
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  exampleText: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  remarksText: {
    marginTop: 8,
    fontStyle: 'italic',
  },
  annotationsContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  annoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  annoTitle: {
    fontWeight: '600',
  },
  addAnnoLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addAnnoLinkText: {
    fontWeight: '600',
    marginLeft: 3,
  },
  annoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  annoTarget: {
    fontWeight: '600',
    marginBottom: 2,
  },
  annoContent: {
    lineHeight: 17,
  },
});
