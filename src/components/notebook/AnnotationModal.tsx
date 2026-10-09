import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '../common/Button';
import { Ionicons } from '@expo/vector-icons';

interface AnnotationModalProps {
  visible: boolean;
  meaningId: string;
  onClose: () => void;
  onSave: (data: {
    target_field?: 'zh_definition' | 'en_definition' | 'example' | 'source' | 'remarks';
    target_text?: string;
    content: string;
  }) => void;
}

export function AnnotationModal({
  visible,
  meaningId,
  onClose,
  onSave,
}: AnnotationModalProps) {
  const { colors, fontScale } = useTheme();

  const [targetField, setTargetField] = useState<
    'zh_definition' | 'en_definition' | 'example' | 'source' | 'remarks'
  >('zh_definition');
  const [targetText, setTargetText] = useState('');
  const [content, setContent] = useState('');

  const handleSave = () => {
    if (!content.trim()) {
      Alert.alert('提示', '请填写批注内容');
      return;
    }
    onSave({
      target_field: targetField,
      target_text: targetText.trim() || undefined,
      content: content.trim(),
    });
    setContent('');
    setTargetText('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text, fontSize: 16 * fontScale }]}>
              添加定向批注
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Target field selector */}
          <Text style={[styles.label, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
            关联字段
          </Text>
          <View style={styles.fieldSelector}>
            {[
              { id: 'zh_definition', name: '中文释义' },
              { id: 'en_definition', name: '英文释义' },
              { id: 'example', name: '例句片段' },
              { id: 'remarks', name: '备注' },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.fieldChip,
                  {
                    backgroundColor:
                      targetField === f.id ? colors.primaryLight : colors.inputBg,
                    borderColor: targetField === f.id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setTargetField(f.id as any)}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: targetField === f.id ? colors.primary : colors.textSecondary,
                      fontSize: 12 * fontScale,
                    },
                  ]}
                >
                  {f.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textSecondary, fontSize: 12 * fontScale, marginTop: 10 }]}>
            批注目标字词/片段 (可选)
          </Text>
          <TextInput
            value={targetText}
            onChangeText={setTargetText}
            placeholder="如特定动词搭配、从句或关键词..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
              },
            ]}
          />

          <Text style={[styles.label, { color: colors.textSecondary, fontSize: 12 * fontScale, marginTop: 10 }]}>
            批注内容 (必填)
          </Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="输入针对该字段的深度语法剖析、用法注意或易混点..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            style={[
              styles.textArea,
              {
                color: colors.text,
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
              },
            ]}
          />

          <View style={styles.footer}>
            <Button
              title="取消"
              variant="outline"
              size="small"
              onPress={onClose}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="保存批注"
              variant="primary"
              size="small"
              onPress={handleSave}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontWeight: '700',
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fieldChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontWeight: '600',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
