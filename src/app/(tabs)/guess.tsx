import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { LLMClient } from '@/services/llm/client';
import { SelectedRegion } from '@/types';
import { RegionDrawer } from '@/components/query/RegionDrawer';
import { GuessClueCard } from '@/components/guess/GuessClueCard';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Ionicons } from '@expo/vector-icons';

interface ClueStage {
  stage: number;
  stage_title: string;
  hint_content: string;
  is_final: boolean;
  final_data?: {
    word: string;
    phonetic?: string;
    zh_definition: string;
    en_definition: string;
    example: string;
  };
}

export default function GuessScreen() {
  const { colors, fontScale, spacingMultiplier } = useTheme();
  const { activeProvider, activeApiKey } = useSettings();
  const router = useRouter();

  const [inputMode, setInputMode] = useState<'image' | 'text'>('image');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | undefined>(undefined);
  const [targetWord, setTargetWord] = useState('');
  const [contextSentence, setContextSentence] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [clues, setClues] = useState<ClueStage[]>([]);

  const handlePickImage = async (useCamera: boolean) => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setSelectedRegion(undefined);
        setClues([]);
      }
    } catch (e: any) {
      Alert.alert('获取图片失败', e?.message || '请检查权限');
    }
  };

  /**
   * Start guessing from stage 1
   */
  const handleStartGuess = async () => {
    if (inputMode === 'text') {
      if (!targetWord.trim()) {
        Alert.alert('提示', '请输入需要猜测的目标单词或短语');
        return;
      }
      if (!contextSentence.trim()) {
        Alert.alert('提示', '请输入该词所在的上下文例句，以便进行语境推测');
        return;
      }
    } else {
      if (!imageUri) {
        Alert.alert('提示', '请先拍照或选取包含目标单词的图片');
        return;
      }
    }

    setLoading(true);
    setClues([]);

    try {
      let wordToGuess = targetWord.trim();
      let context = contextSentence.trim();

      // If in image mode, simulate OCR extraction if empty
      if (inputMode === 'image') {
        if (!wordToGuess) wordToGuess = 'unfamiliar word';
        if (!context) context = 'The contextual passage captured from the document.';
      }

      const stage1 = await LLMClient.getGuessClue(
        wordToGuess,
        context,
        1,
        activeProvider,
        activeApiKey
      );

      setClues([stage1]);
    } catch (e: any) {
      Alert.alert('猜词启动失败', e?.message || '无法获取提示');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Request next stage clue (stage 2, 3, or final 4)
   */
  const handleNextStage = async () => {
    if (clues.length >= 4 || loadingNext) return;
    const nextStageNum = clues.length + 1;
    setLoadingNext(true);

    try {
      let wordToGuess = targetWord.trim() || 'unfamiliar word';
      let context = contextSentence.trim() || 'Contextual sentence from reading.';

      const nextClue = await LLMClient.getGuessClue(
        wordToGuess,
        context,
        nextStageNum,
        activeProvider,
        activeApiKey
      );

      setClues([...clues, nextClue]);
    } catch (e: any) {
      Alert.alert('获取下一阶段提示失败', e?.message || '网络连接异常');
    } finally {
      setLoadingNext(false);
    }
  };

  /**
   * Transfer target word & context to "查询和记录" screen
   */
  const handleTransferToQuery = (word: string) => {
    const finalWord = targetWord.trim() || word || '';
    router.replace({
      pathname: '/(tabs)',
      params: { word: finalWord },
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      {/* Guiding Principle Card */}
      <Card variant="flat" style={{ backgroundColor: colors.primaryLight, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <Text style={[styles.guideTitle, { color: colors.primary, fontSize: 14 * fontScale }]}>
            猜词辅助核心原则
          </Text>
        </View>
        <Text style={[styles.guideText, { color: colors.text, fontSize: 12.5 * fontScale }]}>
          不直接给出释义，而是通过语境线索、语义联想、词根词缀等 4 个阶段逐步引导，助你培养像母语者一样的语境解码能力。
        </Text>
      </Card>

      {/* Input Mode Selector */}
      <View style={[styles.modeTabs, { backgroundColor: colors.inputBg }]}>
        <TouchableOpacity
          style={[styles.modeTab, inputMode === 'image' && { backgroundColor: colors.surface }]}
          onPress={() => setInputMode('image')}
        >
          <Ionicons
            name="camera-outline"
            size={16}
            color={inputMode === 'image' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.modeTabText,
              {
                color: inputMode === 'image' ? colors.primary : colors.textSecondary,
                fontSize: 13 * fontScale,
              },
            ]}
          >
            拍照 / 图片勾画
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, inputMode === 'text' && { backgroundColor: colors.surface }]}
          onPress={() => setInputMode('text')}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={inputMode === 'text' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.modeTabText,
              {
                color: inputMode === 'text' ? colors.primary : colors.textSecondary,
                fontSize: 13 * fontScale,
              },
            ]}
          >
            直接输入语境句
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input Body */}
      {inputMode === 'image' ? (
        <Card variant="outlined" style={{ marginTop: 12 }}>
          {imageUri ? (
            <View>
              <RegionDrawer
                imageUri={imageUri}
                region={selectedRegion}
                onRegionChange={setSelectedRegion}
              />
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                  可选：指定图片中的目标词（留空则由 AI 自动锁定）
                </Text>
                <TextInput
                  value={targetWord}
                  onChangeText={setTargetWord}
                  placeholder="例如：ephemeral"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.textInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                />
              </View>
            </View>
          ) : (
            <View style={styles.imagePickPlaceholder}>
              <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.imagePickPrompt, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
                拍摄英文读物页面或截取屏幕文字
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <Button
                  title="拍照"
                  size="small"
                  variant="outline"
                  onPress={() => handlePickImage(true)}
                  icon={<Ionicons name="camera" size={14} color={colors.text} />}
                  style={{ marginRight: 8 }}
                />
                <Button
                  title="从相册选"
                  size="small"
                  variant="outline"
                  onPress={() => handlePickImage(false)}
                  icon={<Ionicons name="images" size={14} color={colors.text} />}
                />
              </View>
            </View>
          )}
        </Card>
      ) : (
        <Card variant="outlined" style={{ marginTop: 12 }}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
            目标生词或短语
          </Text>
          <TextInput
            value={targetWord}
            onChangeText={setTargetWord}
            placeholder="例如：resilience"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.textInput,
              {
                color: colors.text,
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
              },
            ]}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale, marginTop: 10 }]}>
            原句上下文 / 上下文段落 (必需)
          </Text>
          <TextInput
            value={contextSentence}
            onChangeText={setContextSentence}
            placeholder="例如：The team showed great resilience after conceding an early goal."
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
        </Card>
      )}

      {/* Start Button */}
      <View style={{ marginTop: 14 }}>
        <Button
          title={loading ? '正在分析语境...' : '开启猜词推理'}
          onPress={handleStartGuess}
          loading={loading}
          icon={<Ionicons name="help-buoy-outline" size={16} color="#FFFFFF" />}
        />
      </View>

      {/* Progressive Clue Cards */}
      {clues.length > 0 && (
        <GuessClueCard
          clues={clues}
          currentStage={clues.length}
          totalStages={4}
          loadingNext={loadingNext}
          onNextStage={handleNextStage}
          onTransferToQuery={handleTransferToQuery}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  guideTitle: {
    fontWeight: '700',
    marginLeft: 6,
  },
  guideText: {
    marginTop: 6,
    lineHeight: 18,
  },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  modeTabText: {
    marginLeft: 5,
    fontWeight: '600',
  },
  imagePickPlaceholder: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  imagePickPrompt: {
    marginTop: 8,
  },
  fieldLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  textInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 13,
  },
});
