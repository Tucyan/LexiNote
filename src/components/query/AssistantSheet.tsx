import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AIMessage, QueryResult } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { LLMClient } from '@/services/llm/client';
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

  if (!currentQuery) return null;

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;

    const userMsg: AIMessage = {
      id: generateId('msg'),
      role: 'user',
      content: inputText.trim(),
      created_at: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    onMessagesChange(newMessages);
    setInputText('');
    setIsSending(true);

    try {
      const reply = await LLMClient.sendChatMessage(
        newMessages,
        currentQuery,
        activeProvider,
        activeApiKey
      );

      const assistantMsg: AIMessage = {
        id: generateId('msg'),
        role: 'assistant',
        content: reply,
        created_at: new Date().toISOString(),
      };

      onMessagesChange([...newMessages, assistantMsg]);
    } catch (e: any) {
      const errorMsg: AIMessage = {
        id: generateId('msg'),
        role: 'assistant',
        content: `回答出错: ${e.message || '请检查网络或 API 配置'}`,
        created_at: new Date().toISOString(),
      };
      onMessagesChange([...newMessages, errorMsg]);
    } finally {
      setIsSending(false);
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
            : '点击展开对话，提问语境用法、助记技巧或近义辨析...'}
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
                  <Text style={[styles.headerTitle, { color: colors.text, fontSize: 16 * fontScale }]}>
                    AI 助手 · {currentQuery.word}
                  </Text>
                  <Text style={[styles.headerSub, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>
                    已绑定当前词汇与释义上下文
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setIsFullScreen(!isFullScreen)}
                  style={styles.headerBtn}
                >
                  <Ionicons
                    name={isFullScreen ? 'contract-outline' : 'expand-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsExpanded(false)} style={styles.headerBtn}>
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
            <ScrollView style={styles.messagesList} contentContainerStyle={{ padding: 16 }}>
              {messages.length === 0 ? (
                <View style={styles.emptyMessages}>
                  <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptyPrompt, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
                    有问题？随时向我提问关于「{currentQuery.word}」的一切！
                  </Text>
                </View>
              ) : (
                messages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.messageBubble,
                      m.role === 'user'
                        ? [styles.userBubble, { backgroundColor: colors.primary }]
                        : [styles.assistantBubble, { backgroundColor: colors.inputBg, borderColor: colors.border }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        {
                          color: m.role === 'user' ? '#FFFFFF' : colors.text,
                          fontSize: 13.5 * fontScale,
                        },
                      ]}
                    >
                      {m.content}
                    </Text>
                  </View>
                ))
              )}

              {isSending ? (
                <View style={[styles.assistantBubble, { backgroundColor: colors.inputBg, width: 80, padding: 12 }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null}
            </ScrollView>

            {/* Input Bar */}
            <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder={`询问关于 "${currentQuery.word}" 的任何问题...`}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.chatInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    fontSize: 14 * fontScale,
                  },
                ]}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  { backgroundColor: inputText.trim() ? colors.primary : colors.inputBg },
                ]}
                disabled={!inputText.trim() || isSending}
                onPress={handleSend}
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={inputText.trim() ? '#FFFFFF' : colors.textMuted}
                />
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
    height: '70%',
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
    paddingVertical: 5,
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
  },
  messageBubble: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    maxWidth: '85%',
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
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    marginRight: 10,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
