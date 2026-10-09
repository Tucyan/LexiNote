import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { QueryResult } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { formatPhonetic } from '@/utils/phonetic';

interface InfoViewProps {
  result: QueryResult;
  onRefreshFromAI?: () => void;
  isOrganizing?: boolean;
  onToggleMeaningSelected?: (meaningId: string) => void;
  onToggleDefinitionChoice?: (meaningId: string, choice: 'zh' | 'en') => void;
  onSelectSuggestion?: (word: string) => void;
  onOpenAssistantWithText?: (text: string) => void;
}

export function InfoView({
  result,
  onRefreshFromAI,
  isOrganizing = false,
  onToggleMeaningSelected,
  onToggleDefinitionChoice,
  onSelectSuggestion,
  onOpenAssistantWithText,
}: InfoViewProps) {
  const { colors, fontScale } = useTheme();

  const copyText = async (text: string) => {
    await Clipboard.setStringAsync(text);
  };

  // 1. Render Error / Feedback View when input is invalid / typo / long text / irrelevant
  if (result.is_invalid && result.feedback) {
    const feedback = result.feedback;
    const isMisspelling = feedback.type === 'misspelling';
    const isLongText = feedback.type === 'long_text';
    const isChinese = feedback.type === 'chinese_lookup';
    const isIrrelevant = feedback.type === 'irrelevant_content';
    const isGibberish = feedback.type === 'gibberish';

    let iconName: any = 'alert-circle';
    let iconColor = '#F59E0B';
    if (isMisspelling) {
      iconName = 'pencil-outline';
      iconColor = colors.primary;
    } else if (isLongText) {
      iconName = 'document-text-outline';
      iconColor = '#3B82F6';
    } else if (isChinese) {
      iconName = 'language-outline';
      iconColor = '#10B981';
    } else if (isIrrelevant) {
      iconName = 'bulb-outline';
      iconColor = '#EC4899';
    } else if (isGibberish) {
      iconName = 'help-circle-outline';
      iconColor = '#EF4444';
    }

    return (
      <View style={styles.container}>
        <Card
          variant="elevated"
          style={[styles.feedbackCard, { borderColor: iconColor, borderWidth: 1.5 }]}
        >
          {/* Header */}
          <View style={styles.feedbackHeader}>
            <View style={[styles.feedbackIconBadge, { backgroundColor: iconColor + '20' }]}>
              <Ionicons name={iconName} size={22} color={iconColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.feedbackTitle, { color: colors.text, fontSize: 17 * fontScale }]}>
                {feedback.title}
              </Text>
              <Text style={[styles.feedbackOriginal, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                原始输入：{feedback.original_input}
              </Text>
            </View>
          </View>

          {/* Explanation message */}
          <View style={[styles.feedbackMessageBox, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.feedbackMessageText, { color: colors.text, fontSize: 13.5 * fontScale }]}>
              {feedback.message}
            </Text>
          </View>

          {/* Clickable Suggestions (1~3 words) */}
          {feedback.suggestions && feedback.suggestions.length > 0 ? (
            <View style={styles.suggestionSection}>
              <View style={styles.suggestionSectionHeader}>
                <Ionicons name="sparkles" size={15} color={colors.primary} />
                <Text style={[styles.suggestionSectionTitle, { color: colors.text, fontSize: 13.5 * fontScale }]}>
                  {feedback.action_hint || '你可能想查这些词（点击即可查询）：'}
                </Text>
              </View>

              <View style={styles.suggestionList}>
                {feedback.suggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.suggestionCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.primary,
                        borderWidth: 1.5,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => onSelectSuggestion?.(item.word)}
                  >
                    <View style={styles.suggestionTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="search" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.suggestionWord, { color: colors.primary, fontSize: 15 * fontScale }]}>
                          {item.word}
                        </Text>
                      </View>
                      <View style={[styles.clickQueryBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.clickQueryText, { color: colors.primary, fontSize: 11 * fontScale }]}>
                          点击查询 ➔
                        </Text>
                      </View>
                    </View>

                    {item.zh_hint ? (
                      <Text style={[styles.suggestionZh, { color: colors.textSecondary, fontSize: 12.5 * fontScale }]}>
                        {item.zh_hint}
                      </Text>
                    ) : null}

                    {item.reason ? (
                      <Text style={[styles.suggestionReason, { color: colors.textTertiary, fontSize: 11 * fontScale }]}>
                        {item.reason}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* If Long Text: provide action to deep analyze in AI Assistant */}
          {isLongText && onOpenAssistantWithText ? (
            <TouchableOpacity
              style={[styles.assistantActionBtn, { backgroundColor: colors.primary }]}
              onPress={() => onOpenAssistantWithText(feedback.original_input)}
            >
              <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
              <Text style={[styles.assistantActionText, { fontSize: 13 * fontScale }]}>
                在 AI 助教中深度剖析此段落
              </Text>
            </TouchableOpacity>
          ) : null}
        </Card>
      </View>
    );
  }

  // 2. Normal Vocabulary Detail View
  const formattedPhonetic = formatPhonetic(result.phonetic);

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

            {formattedPhonetic ? (
              <View style={styles.phoneticRow}>
                <Text
                  style={[
                    styles.phoneticText,
                    {
                      color: colors.textSecondary,
                      fontSize: 14.5 * fontScale,
                      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
                    },
                  ]}
                >
                  {formattedPhonetic}
                </Text>
                <TouchableOpacity
                  onPress={() => copyText(result.word)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginLeft: 8 }}
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

      {/* 3. Meanings List Header & Selection Hint */}
      <View style={styles.meaningsHeaderRow}>
        <Text style={[styles.meaningsHeader, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
          释义与例句 ({result.meanings.length} 条)
        </Text>
        <Text style={[styles.selectionHintText, { color: colors.primary, fontSize: 11.5 * fontScale }]}>
          ● 点击卡片选入笔记 · 中英二选一
        </Text>
      </View>

      {/* Meanings Cards with Direct In-Place Selection & Border Feedback */}
      {result.meanings.map((meaning, index) => {
        const isSelected = meaning.selected !== false;
        const choice = meaning.definition_choice || 'zh'; // 'zh' or 'en' (二选一)

        return (
          <Card
            key={meaning.id || index}
            variant="outlined"
            style={[
              styles.meaningCard,
              isSelected
                ? {
                    borderColor: colors.primary,
                    borderWidth: 2,
                    backgroundColor: colors.surface,
                  }
                : {
                    borderColor: colors.border,
                    borderWidth: 1,
                    opacity: 0.68,
                    backgroundColor: colors.surface,
                  },
            ]}
          >
            {/* Top Bar: Index + Part of Speech + In-Place Select Toggle */}
            <View style={styles.meaningTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={[
                    styles.indexCircle,
                    { backgroundColor: isSelected ? colors.primary : colors.inputBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.indexText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary, fontSize: 12 * fontScale },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                {meaning.part_of_speech ? (
                  <Badge label={meaning.part_of_speech} variant="primary" style={{ marginLeft: 8 }} />
                ) : null}
              </View>

              {/* Selection Toggle Badge Button */}
              <TouchableOpacity
                style={[
                  styles.selectToggleBtn,
                  isSelected
                    ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                    : { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
                onPress={() => onToggleMeaningSelected?.(meaning.id)}
              >
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={16}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.selectToggleText,
                    {
                      color: isSelected ? colors.primary : colors.textSecondary,
                      fontSize: 12 * fontScale,
                    },
                  ]}
                >
                  {isSelected ? '已选入笔记' : '未选入'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 中英文释义二选一切换器 (Choice Toggle Bar) */}
            <View style={[styles.choiceContainer, { borderBottomColor: colors.border }]}>
              <Text style={[styles.choiceHeading, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>
                解释语言（二选一保存）：
              </Text>
              <View style={styles.choiceRow}>
                <TouchableOpacity
                  style={[
                    styles.choiceButton,
                    choice === 'zh'
                      ? { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1.5 }
                      : { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 },
                  ]}
                  onPress={() => onToggleDefinitionChoice?.(meaning.id, 'zh')}
                >
                  <Ionicons
                    name={choice === 'zh' ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={choice === 'zh' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.choiceButtonText,
                      {
                        color: choice === 'zh' ? colors.primary : colors.textSecondary,
                        fontSize: 11.5 * fontScale,
                      },
                    ]}
                  >
                    🇨🇳 中文释义 {choice === 'zh' ? '(已选)' : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.choiceButton,
                    choice === 'en'
                      ? { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1.5 }
                      : { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 },
                  ]}
                  onPress={() => onToggleDefinitionChoice?.(meaning.id, 'en')}
                >
                  <Ionicons
                    name={choice === 'en' ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={choice === 'en' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.choiceButtonText,
                      {
                        color: choice === 'en' ? colors.primary : colors.textSecondary,
                        fontSize: 11.5 * fontScale,
                      },
                    ]}
                  >
                    🇬🇧 英文释义 {choice === 'en' ? '(已选)' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Definitions: Chinese & English with dynamic border highlighting */}
            {meaning.zh_definition ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onToggleDefinitionChoice?.(meaning.id, 'zh')}
                style={[
                  styles.defBox,
                  choice === 'zh'
                    ? {
                        borderColor: colors.primary,
                        borderWidth: 1.5,
                        backgroundColor: colors.primaryLight + '18',
                      }
                    : {
                        borderColor: colors.border,
                        borderWidth: 1,
                        backgroundColor: colors.inputBg,
                        opacity: 0.65,
                      },
                ]}
              >
                <View style={styles.defBoxHeader}>
                  <Text style={[styles.defTag, { color: choice === 'zh' ? colors.primary : colors.textTertiary, fontSize: 11 * fontScale }]}>
                    中文释义 {choice === 'zh' ? '● 保存此项' : ''}
                  </Text>
                </View>
                <Text style={[styles.zhDef, { color: colors.text, fontSize: 14.5 * fontScale }]}>
                  {meaning.zh_definition}
                </Text>
              </TouchableOpacity>
            ) : null}

            {meaning.en_definition ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onToggleDefinitionChoice?.(meaning.id, 'en')}
                style={[
                  styles.defBox,
                  choice === 'en'
                    ? {
                        borderColor: colors.primary,
                        borderWidth: 1.5,
                        backgroundColor: colors.primaryLight + '18',
                      }
                    : {
                        borderColor: colors.border,
                        borderWidth: 1,
                        backgroundColor: colors.inputBg,
                        opacity: 0.65,
                      },
                ]}
              >
                <View style={styles.defBoxHeader}>
                  <Text style={[styles.defTag, { color: choice === 'en' ? colors.primary : colors.textTertiary, fontSize: 11 * fontScale }]}>
                    英文释义 {choice === 'en' ? '● 保存此项' : ''}
                  </Text>
                </View>
                <Text style={[styles.enDef, { color: colors.textSecondary, fontSize: 13.5 * fontScale }]}>
                  {meaning.en_definition}
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Example */}
            {meaning.example ? (
              <View
                style={[
                  styles.exampleBox,
                  {
                    borderLeftColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: colors.inputBg,
                  },
                ]}
              >
                <Text style={[styles.exampleLabel, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>
                  典型例句:
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
        );
      })}
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
    fontWeight: '500',
    letterSpacing: 0.3,
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
  meaningsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  meaningsHeader: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectionHintText: {
    fontWeight: '600',
  },
  meaningCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
  },
  meaningTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  selectToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  selectToggleText: {
    fontWeight: '600',
  },
  choiceContainer: {
    paddingVertical: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  choiceHeading: {
    fontWeight: '600',
    marginBottom: 6,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  choiceButtonText: {
    fontWeight: '600',
  },
  defBox: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  defBoxHeader: {
    marginBottom: 2,
  },
  defTag: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  zhDef: {
    fontWeight: '600',
    lineHeight: 20,
  },
  enDef: {
    lineHeight: 19,
    fontStyle: 'italic',
  },
  exampleBox: {
    borderLeftWidth: 3,
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
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
    gap: 4,
  },
  remarksText: {
    flex: 1,
    lineHeight: 16,
  },
  feedbackCard: {
    padding: 16,
    borderRadius: 14,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTitle: {
    fontWeight: '800',
  },
  feedbackOriginal: {
    marginTop: 2,
  },
  feedbackMessageBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  feedbackMessageText: {
    lineHeight: 20,
  },
  suggestionSection: {
    marginTop: 6,
  },
  suggestionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  suggestionSectionTitle: {
    fontWeight: '700',
  },
  suggestionList: {
    gap: 8,
  },
  suggestionCard: {
    padding: 12,
    borderRadius: 10,
  },
  suggestionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionWord: {
    fontWeight: '700',
  },
  clickQueryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clickQueryText: {
    fontWeight: '700',
  },
  suggestionZh: {
    marginTop: 4,
    fontWeight: '500',
  },
  suggestionReason: {
    marginTop: 2,
    fontStyle: 'italic',
  },
  assistantActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
    gap: 6,
  },
  assistantActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
