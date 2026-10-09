import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Vocabulary } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { BackupService } from '@/services/storage/backupService';
import { Button } from '../common/Button';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

interface ExportModalProps {
  visible: boolean;
  vocabularies: Vocabulary[];
  notebookName?: string;
  onClose: () => void;
}

export function ExportModal({
  visible,
  vocabularies,
  notebookName,
  onClose,
}: ExportModalProps) {
  const { colors, fontScale } = useTheme();
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);

  const getExportText = () => {
    if (format === 'markdown') {
      return BackupService.generateMarkdown(vocabularies, notebookName);
    } else {
      return JSON.stringify(vocabularies, null, 2);
    }
  };

  const handleCopy = async () => {
    const text = getExportText();
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('已复制', `已成功将 ${vocabularies.length} 条笔记导出内容复制到剪贴板！`);
  };

  const previewContent = getExportText();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.text, fontSize: 17 * fontScale }]}>
                导出笔记 (当前筛选：{vocabularies.length} 条)
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                包含释义、例句、来源与批注备注
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Format selector */}
          <View style={[styles.formatRow, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.formatTab,
                format === 'markdown' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => setFormat('markdown')}
            >
              <Text
                style={[
                  styles.formatText,
                  {
                    color: format === 'markdown' ? colors.primary : colors.textSecondary,
                    fontSize: 13 * fontScale,
                  },
                ]}
              >
                Markdown 格式
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.formatTab,
                format === 'json' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => setFormat('json')}
            >
              <Text
                style={[
                  styles.formatText,
                  {
                    color: format === 'json' ? colors.primary : colors.textSecondary,
                    fontSize: 13 * fontScale,
                  },
                ]}
              >
                JSON 结构化格式
              </Text>
            </TouchableOpacity>
          </View>

          {/* Preview Box */}
          <ScrollView style={styles.previewBox} contentContainerStyle={{ padding: 12 }}>
            <Text
              style={[
                styles.previewCode,
                { color: colors.text, backgroundColor: colors.inputBg, fontSize: 12 * fontScale },
              ]}
            >
              {previewContent}
            </Text>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button
              title="关闭"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title={copied ? '已复制到剪贴板！' : '复制导出内容'}
              variant="primary"
              onPress={handleCopy}
              icon={<Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#FFFFFF" />}
              style={{ flex: 2 }}
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
  sheet: {
    height: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  subtitle: {
    marginTop: 2,
  },
  formatRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  formatTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  formatText: {
    fontWeight: '600',
  },
  previewBox: {
    flex: 1,
    padding: 8,
  },
  previewCode: {
    fontFamily: 'monospace',
    padding: 12,
    borderRadius: 8,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
});
