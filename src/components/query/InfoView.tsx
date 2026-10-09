import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { QueryResult } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

interface InfoViewProps {
  result: QueryResult;
  onRefreshFromAI?: () => void;
  isOrganizing?: boolean;
}

export function InfoView({ result, onRefreshFromAI, isOrganizing = false }: InfoViewProps) {
  const { colors, fontScale } = useTheme();

  const copyText = async (text: string) => {
    await Clipboard.setStringAsync(text);
  };

  return (
    <View style={styles.container}>
      {/* 1. Image OCR Recognized Text (shown at top if present, per PRD 2.1.3) */}
      {result.recognized_text ? (
        <Card variant="outlined" style={[styles.ocrCard, { backgroundColor: colors.inputBg }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="scan-outline" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.primary, fontSize: 13 * fontScale }]}>
              图片识别整理文字
            </Text>
          </View>
          <Text style={[styles.ocrText, { color: colors.text, fontSize: 13.5 * fontScale }]}>
            {result.recognized_text}
          </Text>
        </Card>
      ) : null}

      {/* 2. Main Word Header Card */}
      <Card variant="elevated">
        <View style={styles.wordHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={[styles.wordText, { color: colors.text, fontSize: 24 * fontScale }]}>
                {result.word}
              </Text>
              <Badge
                label={result.type === 'phrase' ? '短语' : '单词'}
                variant="neutral"
                style={{ marginLeft: 8 }}
              />
              {result.is_from_local ? (
                <Badge label="本地词库记录" variant="success" style={{ marginLeft: 4 }} />
              ) : (
                <Badge label="AI 智能解析" variant="primary" style={{ marginLeft: 4 }} />
              )}
            </View>

            {result.phonetic ? (
              <View style={styles.phoneticRow}>
                <Text style={[styles.phoneticText, { color: colors.textSecondary, fontSize: 14 * fontScale }]}>
                  {result.phonetic}
                </Text>
                <TouchableOpacity
                  onPress={() => copyText(result.word)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginLeft: 6 }}
                >
                  <Ionicons name="copy-outline" size={15} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {result.is_from_local && onRefreshFromAI ? (
            <TouchableOpacity
              style={[styles.aiSupplementBtn, { backgroundColor: colors.primaryLight }]}
              onPress={onRefreshFromAI}
            >
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={[styles.aiSupplementText, { color: colors.primary, fontSize: 12 * fontScale }]}>
                AI补充
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {result.raw_explanation ? (
          <View style={[styles.explanationBox, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.explanationText, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
              {result.raw_explanation}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* 3. Meanings List */}
      <Text style={[styles.meaningsHeader, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
        释义与例句 ({result.meanings.length} 条)
      </Text>

      {result.meanings.map((meaning, index) => (
        <Card key={meaning.id || index} variant="outlined" style={styles.meaningCard}>
          <View style={styles.meaningTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.indexCircle, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.indexText, { color: colors.primary, fontSize: 12 * fontScale }]}>
                  {index + 1}
                </Text>
              </View>
              {meaning.part_of_speech ? (
                <Badge label={meaning.part_of_speech} variant="primary" style={{ marginLeft: 8 }} />
              ) : null}
            </View>
            {meaning.source ? (
              <Text style={[styles.sourceText, { color: colors.textTertiary, fontSize: 11 * fontScale }]}>
                {meaning.source}
              </Text>
            ) : null}
          </View>

          {/* Definitions */}
          {meaning.zh_definition ? (
            <Text style={[styles.zhDef, { color: colors.text, fontSize: 15 * fontScale }]}>
              {meaning.zh_definition}
            </Text>
          ) : null}

          {meaning.en_definition ? (
            <Text style={[styles.enDef, { color: colors.textSecondary, fontSize: 13.5 * fontScale }]}>
              {meaning.en_definition}
            </Text>
          ) : null}

          {/* Example */}
          {meaning.example ? (
            <View style={[styles.exampleBox, { borderLeftColor: colors.primary, backgroundColor: colors.inputBg }]}>
              <Text style={[styles.exampleLabel, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>
                例句 / 语境:
              </Text>
              <Text style={[styles.exampleText, { color: colors.text, fontSize: 13 * fontScale }]}>
                "{meaning.example}"
              </Text>
            </View>
          ) : null}

          {/* Remarks */}
          {meaning.remarks ? (
            <View style={styles.remarksRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.remarksText, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                {meaning.remarks}
              </Text>
            </View>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 80,
  },
  ocrCard: {
    marginBottom: 12,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontWeight: '700',
    marginLeft: 6,
  },
  ocrText: {
    lineHeight: 20,
    fontStyle: 'italic',
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  wordText: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  phoneticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  phoneticText: {
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  aiSupplementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  aiSupplementText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  explanationBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  explanationText: {
    lineHeight: 18,
  },
  meaningsHeader: {
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meaningCard: {
    marginBottom: 10,
    padding: 14,
  },
  meaningTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  indexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontWeight: '700',
  },
  sourceText: {
    fontStyle: 'italic',
  },
  zhDef: {
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  enDef: {
    lineHeight: 19,
    marginBottom: 8,
  },
  exampleBox: {
    borderLeftWidth: 3,
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  exampleLabel: {
    fontWeight: '600',
    marginBottom: 2,
  },
  exampleText: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  remarksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  remarksText: {
    marginLeft: 5,
    flex: 1,
  },
});
