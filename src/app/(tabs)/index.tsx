import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  QueryType,
  QueryResult,
  AIMessage,
  SelectedRegion,
  QueryHistory,
  SaveFieldSelection,
  QueryMeaningDraft,
} from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { useNotebooks } from '@/context/NotebookContext';
import { useSettings } from '@/context/SettingsContext';
import { useHistory } from '@/context/HistoryContext';
import { LLMClient, LLMException } from '@/services/llm/client';
import { generateId } from '@/utils/id';

import { QueryInputSection } from '@/components/query/QueryInputSection';
import { InfoView } from '@/components/query/InfoView';
import { OrganizeBar } from '@/components/query/OrganizeBar';
import { OrganizeModal } from '@/components/query/OrganizeModal';
import { AssistantSheet } from '@/components/query/AssistantSheet';
import { RecentQueriesModal } from '@/components/query/RecentQueriesModal';
import { Ionicons } from '@expo/vector-icons';

export default function SearchAndRecordScreen() {
  const { colors, fontScale } = useTheme();
  const {
    notebooks,
    findVocabularyByContent,
    saveVocabulary,
  } = useNotebooks();
  const { activeProvider, activeApiKey, settings } = useSettings();
  const {
    recentQueries,
    addQueryHistory,
    updateQueryHistory,
  } = useHistory();

  // Params passed from Guess tab (transfer to query)
  const params = useLocalSearchParams<{ word?: string; context?: string }>();

  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [organizeModalVisible, setOrganizeModalVisible] = useState(false);
  const [saveToDefaultOnly, setSaveToDefaultOnly] = useState(false);

  /**
   * Save snapshot to Recent Queries (max 10 FIFO)
   */
  const saveToHistorySnapshot = useCallback(
    (
      queryId: string,
      queryType: QueryType,
      text?: string,
      imageUri?: string,
      region?: SelectedRegion,
      result?: QueryResult,
      messages?: AIMessage[]
    ) => {
      if (!result) return;
      const historyItem: QueryHistory = {
        id: queryId,
        created_at: new Date().toISOString(),
        query_type: queryType,
        input_text: text,
        input_images: imageUri ? [imageUri] : undefined,
        selected_regions: region ? [region] : undefined,
        recognized_text: result.recognized_text,
        query_results: result,
        ai_messages: messages || [],
        saved_content: { saved: false },
      };
      addQueryHistory(historyItem);
    },
    [addQueryHistory]
  );

  /**
   * Execute saving vocabulary into notebooks
   */
  const executeSave = useCallback(
    async (data: {
      word: string;
      meanings: QueryMeaningDraft[];
      selectedFields: SaveFieldSelection;
      targetNotebookIds: string[];
      userAnnotation?: string;
    }) => {
      try {
        const filteredMeanings = data.meanings.map((m) => {
          const meaningObj: any = {
            id: m.id,
            zh_definition: data.selectedFields.zh_definition ? m.zh_definition : undefined,
            en_definition: data.selectedFields.en_definition ? m.en_definition : undefined,
            phonetic: data.selectedFields.phonetic ? currentResult?.phonetic : undefined,
            example: data.selectedFields.example ? m.example : undefined,
            source: data.selectedFields.source ? m.source : undefined,
            remarks: data.selectedFields.remarks ? m.remarks : undefined,
          };

          if (data.userAnnotation && data.selectedFields.annotations) {
            meaningObj.annotations = [
              {
                id: generateId('anno'),
                meaning_id: m.id,
                target_field: 'zh_definition',
                content: data.userAnnotation,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];
          }

          return meaningObj;
        });

        const savedVocab = await saveVocabulary(
          {
            content: data.word,
            type: currentResult?.type || (data.word.includes(' ') ? 'phrase' : 'word'),
            meanings: filteredMeanings,
          },
          {
            targetNotebookIds: data.targetNotebookIds,
            mergeExisting: true,
          }
        );

        if (currentQueryId) {
          updateQueryHistory(currentQueryId, {
            saved_content: {
              saved: true,
              vocabulary_id: savedVocab.id,
              notebook_ids: data.targetNotebookIds,
              saved_at: new Date().toISOString(),
            },
          });
        }

        setOrganizeModalVisible(false);
        Alert.alert('保存成功', `已将「${data.word}」成功存入指定笔记分类！`);
      } catch (err: any) {
        Alert.alert('保存失败', err?.message || '保存笔记时发生错误');
      }
    },
    [currentResult, currentQueryId, saveVocabulary, updateQueryHistory]
  );

  /**
   * Main Search handler with "词库优先" (Local First) logic
   */
  const handleSearch = useCallback(
    async ({
      queryType,
      text,
      imageUri,
      region,
    }: {
      queryType: QueryType;
      text?: string;
      imageUri?: string;
      region?: SelectedRegion;
    }) => {
      setLoading(true);
      const queryId = generateId('query');
      setCurrentQueryId(queryId);
      setChatMessages([]);

      try {
        let finalResult: QueryResult;

        // 1. Check local vocabulary database FIRST (词库优先)
        if (text && text.trim()) {
          const localMatch = findVocabularyByContent(text.trim());
          if (localMatch) {
            finalResult = {
              word: localMatch.content,
              type: localMatch.type,
              phonetic: localMatch.meanings[0]?.phonetic || '',
              meanings: localMatch.meanings.map((m) => ({
                id: m.id,
                part_of_speech: m.part_of_speech,
                zh_definition: m.zh_definition,
                en_definition: m.en_definition,
                example: m.example,
                source: m.source || '本地词库',
                remarks: m.remarks,
                selected: true,
              })),
              recognized_text: '',
              raw_explanation: '已从本地词库中检索到此记录。点击“AI补充”可获取更多拓展解析。',
              is_from_local: true,
              local_vocabulary_id: localMatch.id,
            };

            setCurrentResult(finalResult);
            saveToHistorySnapshot(queryId, queryType, text, imageUri, region, finalResult, []);
            setLoading(false);
            return;
          }
        }

        // 2. Not in local database: Query with LLM
        if (queryType === 'image' || (queryType === 'both' && imageUri)) {
          finalResult = await LLMClient.queryImage(
            imageUri || '',
            activeProvider,
            activeApiKey,
            text,
            region
          );
        } else {
          finalResult = await LLMClient.queryWord(
            text || '',
            activeProvider,
            activeApiKey
          );
        }

        setCurrentResult(finalResult);
        saveToHistorySnapshot(queryId, queryType, text, imageUri, region, finalResult, []);

        if (settings.auto_record_extra_info) {
          await executeSave({
            word: finalResult.word,
            meanings: finalResult.meanings,
            selectedFields: settings.default_fields_to_save,
            targetNotebookIds: [settings.default_notebook_id],
          });
        }
      } catch (e: any) {
        if (e instanceof LLMException) {
          const alertInfo = e.getFormattedAlert();
          Alert.alert(alertInfo.title, alertInfo.message);
        } else {
          Alert.alert('查询失败', e?.message || '无法获取查询结果');
        }
      } finally {
        setLoading(false);
      }
    },
    [
      findVocabularyByContent,
      saveToHistorySnapshot,
      activeProvider,
      activeApiKey,
      settings,
      executeSave,
    ]
  );

  // If params passed from guess screen, trigger lookup
  useEffect(() => {
    if (params.word && params.word.trim()) {
      handleSearch({
        queryType: 'text',
        text: params.word.trim(),
      });
    }
  }, [params.word, handleSearch]);

  /**
   * Request supplementary explanations from AI for a local word
   */
  const handleAISupplement = async () => {
    if (!currentResult) return;
    setLoading(true);
    try {
      const aiResult = await LLMClient.queryWord(
        currentResult.word,
        activeProvider,
        activeApiKey,
        '请为此词汇提供更加丰富、深入的语境用法与高级搭配'
      );

      const mergedMeanings = [...currentResult.meanings];
      for (const newM of aiResult.meanings) {
        if (!mergedMeanings.some((m) => m.zh_definition === newM.zh_definition)) {
          mergedMeanings.push(newM);
        }
      }

      const updatedResult: QueryResult = {
        ...currentResult,
        meanings: mergedMeanings,
        raw_explanation: aiResult.raw_explanation || currentResult.raw_explanation,
        is_from_local: false,
      };

      setCurrentResult(updatedResult);
      if (currentQueryId) {
        updateQueryHistory(currentQueryId, { query_results: updatedResult });
      }
    } catch (err: any) {
      if (err instanceof LLMException) {
        const alertInfo = err.getFormattedAlert();
        Alert.alert(alertInfo.title, alertInfo.message);
      } else {
        Alert.alert('AI补充失败', err?.message || '请检查网络');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update AI messages and persist into current query snapshot
   */
  const handleMessagesChange = (newMessages: AIMessage[]) => {
    setChatMessages(newMessages);
    if (currentQueryId) {
      updateQueryHistory(currentQueryId, { ai_messages: newMessages });
    }
  };

  /**
   * Restore history item
   */
  const handleSelectHistoryItem = (item: QueryHistory) => {
    setCurrentQueryId(item.id);
    setCurrentResult(item.query_results);
    setChatMessages(item.ai_messages || []);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar with History Button */}
      <View style={[styles.topActions, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.appName, { color: colors.primary, fontSize: 16 * fontScale }]}>
            LexiNote
          </Text>
          <Text style={[styles.versionTag, { color: colors.textTertiary, fontSize: 11 * fontScale }]}>
            v1.1
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.historyBtn, { backgroundColor: colors.inputBg }]}
          onPress={() => setHistoryModalVisible(true)}
        >
          <Ionicons name="time-outline" size={17} color={colors.text} />
          <Text style={[styles.historyBtnText, { color: colors.text, fontSize: 12.5 * fontScale }]}>
            最近查询 ({recentQueries.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ padding: 14, paddingBottom: 150 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Three-mode Query Input Section */}
        <QueryInputSection
          onSearch={handleSearch}
          loading={loading}
          initialText={params.word || ''}
        />

        {/* Top Info View */}
        {currentResult ? (
          <InfoView
            result={currentResult}
            onRefreshFromAI={handleAISupplement}
          />
        ) : (
          <View style={styles.welcomeBox}>
            <Ionicons name="sparkles-outline" size={48} color={colors.primaryLight} />
            <Text style={[styles.welcomeTitle, { color: colors.text, fontSize: 17 * fontScale }]}>
              词库优先 · AI 辅助 · 按需记录
            </Text>
            <Text style={[styles.welcomeDesc, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
              支持直接输入单词短语，或上传图片并用手指在图上勾画指定区域。本地已有词库优先展示，未经确认不擅自保存。
            </Text>
          </View>
        )}
      </ScrollView>

      {/* AI Assistant Sheet (Floating mini-bar, expands to chat or fullscreen) */}
      {currentResult ? (
        <AssistantSheet
          currentQuery={currentResult}
          messages={chatMessages}
          onMessagesChange={handleMessagesChange}
        />
      ) : null}

      {/* Bottom Organize Bar: [整理笔记] -> [添加到默认笔记] [选择添加笔记] */}
      {currentResult ? (
        <OrganizeBar
          disabled={loading}
          onOrganizeDefault={() => {
            setSaveToDefaultOnly(true);
            setOrganizeModalVisible(true);
          }}
          onOrganizeCustom={() => {
            setSaveToDefaultOnly(false);
            setOrganizeModalVisible(true);
          }}
        />
      ) : null}

      {/* Organize Modal with field checkboxes & notebook targets */}
      {currentResult ? (
        <OrganizeModal
          visible={organizeModalVisible}
          result={currentResult}
          notebooks={notebooks}
          saveToDefaultOnly={saveToDefaultOnly}
          onClose={() => setOrganizeModalVisible(false)}
          onConfirmSave={executeSave}
        />
      ) : null}

      {/* Recent 10 Queries Modal */}
      <RecentQueriesModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        onSelectQuery={handleSelectHistoryItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  appName: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  versionTag: {
    marginLeft: 6,
    fontWeight: '600',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  historyBtnText: {
    marginLeft: 5,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  welcomeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  welcomeDesc: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
