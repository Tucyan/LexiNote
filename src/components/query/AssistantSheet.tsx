import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { QueryResult, AIMessage } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { LLMClient, LLMException } from '@/services/llm/client';
import { generateId } from '@/utils/id';
import { Ionicons } from '@expo/vector-icons';

interface AssistantSheetProps {
  currentQuery: QueryResult | null;
  messages: AIMessage[];
  onMessagesChange: (messages: AIMessage[]) => void;
}

export function AssistantSheet({
  currentQuery,
  messages,
  onMessagesChange,
}: AssistantSheetProps) {
  const { colors, fontScale } = useTheme();
  const { activeProvider, activeApiKey } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  if (!currentQuery) return null;

  const handleSend = async () => {
    const trimmedInput = inputText.trim();

    // 1. Pre-validation checks for illegal operations
    if (!trimmedInput) {
      Alert.alert('⚠️ 非法操作', '提问内容不能为空，请输入具体问题后再发送。');
      return;
    }
    if (trimmedInput.length > 2000) {
      Alert.alert('⚠️ 非法操作', '提问内容过长（单次限制 2000 字符以内），请精简后重试。');
      return;
    }
    if (isSending) {
      return;
    }

    const userMsg: AIMessage = {
      id: generateId('msg'),
      role: 'user',
      content: trimmedInput,
      created_at: new Date().toISOString(),
    };

    const assistantMsgId = generateId('msg');
    const assistantPlaceholder: AIMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    const messagesWithUser = [...messages, userMsg];
    const initialList = [...messagesWithUser, assistantPlaceholder];
    onMessagesChange(initialList);
    setInputText('');
    setIsSending(true);

    let accumulatedContent = '';

    try {
      const finalReply = await LLMClient.sendChatMessage(
        messagesWithUser,
        currentQuery,
        activeProvider,
        activeApiKey,
        (chunkText) => {
          accumulatedContent += chunkText;
          onMessagesChange(
            [...messagesWithUser, {
              id: assistantMsgId,
              role: 'assistant',
              content: accumulatedContent,
              created_at: new Date().toISOString(),
            }]
          );
          // Auto scroll to bottom
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      );

      // Finalize message with complete content
      onMessagesChange(
        [...messagesWithUser, {
          id: assistantMsgId,
          role: 'assistant',
          content: finalReply || accumulatedContent,
          created_at: new Date().toISOString(),
        }]
      );
    } catch (e: any) {
      let errorText = '';
      if (e instanceof LLMException) {
        errorText = `⚠️ ${e.message}\n\n💡 建议操作：\n${e.suggestion || '请检查设置并重试。'}`;
      } else {
        errorText = `⚠️ 回答出错: ${e.message || '请检查网络或 API 配置'}`;
      }

      onMessagesChange(
        [...messagesWithUser, {
          id: assistantMsgId,
          role: 'assistant',
          content: errorText,
          created_at: new Date().toISOString(),
        }]
      );
    } finally {
      setIsSending(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  // Render Collapsed Mini Floating Bar
  const renderCollapsed = () => (
    <TouchableOpacity
      style={[
        styles.collapsedBar,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.text,
        },
      ]}
      activeOpacity={0.85}
      onPress={() => setIsExpanded(true)}
    >
      <View style={[styles.assistantBadge, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="sparkles" size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Text style={[styles.collapsedTitle, { color: colors.text, fontSize: 13 * fontScale }]}>
          AI 伴学助手（当前词：{currentQuery.word}）
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.collapsedSubtitle, { color: colors.textSecondary, fontSize: 11 * fontScale }]}
        >
          {messages.length > 0
            ? messages[messages.length - 1].content
            : '点击展开流式对话，提问语境用法、助记技巧或近义辨析...'}
        </Text>
      </View>
      <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  // Render Expanded or Fullscreen View
  return (
    <>
      {renderCollapsed()}

      <Modal
        visible={isExpanded}
        animationType="slide"
        transparent={!isFullScreen}
        onRequestClose={() => setIsExpanded(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={isFullScreen ? styles.fullScreenContainer : styles.modalBackdrop}
        >
          <View
            style={[
              isFullScreen ? styles.fullScreenContent : styles.sheetContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Header */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.headerTitle, { color: colors.text, fontSize: 16 * fontScale }]}>
                      AI 助手 · {currentQuery.word}
                    </Text>
                    <View style={styles.streamBadge}>
                      <Text style={styles.streamBadgeText}>流式传输</Text>
                    </View>
                  </View>
                  <Text style={[styles.headerSub, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>
                    已绑定当前词汇与释义上下文
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setIsFullScreen(!isFullScreen)}
                  style={styles.headerBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isFullScreen ? 'contract-outline' : 'expand-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsExpanded(false)}
                  style={styles.headerBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Prompt Chips */}
            <View style={[styles.quickChips, { borderBottomColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[
                  '造三个地道例句',
                  '容易混淆的近义词',
                  '如何用联想记忆法记住它？',
                  '在英美剧中常见的口语搭配',
                  '词根词缀及衍生词剖析',
                ].map((prompt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.quickChip, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    onPress={() => handleQuickPrompt(prompt)}
                  >
                    <Text style={[styles.quickChipText, { color: colors.textSecondary, fontSize: 11.5 * fontScale }]}>
                      {prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Chat Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesList}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyMessages}>
                  <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptyPrompt, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
                    有问题？随时向我提问关于「{currentQuery.word}」的一切！
                  </Text>
                </View>
              ) : (
                messages.map((m, idx) => {
                  const isLast = idx === messages.length - 1;
                  const isCurrentStreaming = isSending && isLast && m.role === 'assistant';

                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.messageBubble,
                        m.role === 'user'
                          ? [styles.userBubble, { backgroundColor: colors.primary }]
                          : [styles.assistantBubble, { backgroundColor: colors.inputBg, borderColor: colors.border }],
                      ]}
                    >
                      {m.role === 'assistant' && !m.content && isCurrentStreaming ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text style={{ color: colors.textSecondary, fontSize: 12.5 * fontScale }}>
                            AI 正在思考并组织语言...
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.bubbleText,
                            {
                              color: m.role === 'user' ? '#FFFFFF' : colors.text,
                              fontSize: 13.5 * fontScale,
                              lineHeight: 20 * fontScale,
                            },
                          ]}
                        >
                          {m.content}
                          {isCurrentStreaming ? (
                            <Text style={{ color: colors.primary, fontWeight: '700' }}> ▋</Text>
                          ) : null}
                        </Text>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Input Bar */}
            <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder={`询问关于 "${currentQuery.word}" 的任何问题...`}
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={2000}
                style={[
                  styles.chatInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    fontSize: 13.5 * fontScale,
                  },
                ]}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!inputText.trim() || isSending}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: inputText.trim() && !isSending ? colors.primary : colors.inputBg,
                  },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={18}
                    color={inputText.trim() ? '#FFFFFF' : colors.textMuted}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  collapsedBar: {
    position: 'absolute',
    bottom: 74,
    left: 14,
    right: 14,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  assistantBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedTitle: {
    fontWeight: '700',
  },
  collapsedSubtitle: {
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  fullScreenContainer: {
    flex: 1,
  },
  sheetContent: {
    height: '74%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fullScreenContent: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: '700',
  },
  streamBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  streamBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
  },
  headerSub: {
    marginTop: 2,
  },
  headerBtn: {
    padding: 6,
    marginLeft: 6,
  },
  quickChips: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  quickChipText: {
    fontWeight: '500',
  },
  messagesList: {
    flex: 1,
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyPrompt: {
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    fontWeight: '400',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
