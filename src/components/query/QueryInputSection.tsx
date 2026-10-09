import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { QueryType, SelectedRegion } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { RegionDrawer } from './RegionDrawer';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../common/Button';

interface QueryInputSectionProps {
  onSearch: (params: {
    queryType: QueryType;
    text?: string;
    imageUri?: string;
    region?: SelectedRegion;
  }) => void;
  loading: boolean;
  initialText?: string;
}

export function QueryInputSection({
  onSearch,
  loading,
  initialText = '',
}: QueryInputSectionProps) {
  const { colors, fontScale, spacingMultiplier } = useTheme();
  const [activeMode, setActiveMode] = useState<QueryType>('text');
  const [textInput, setTextInput] = useState(initialText);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | undefined>(undefined);

  const handlePickImage = async (useCamera: boolean) => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      };

      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('提示', '需要相机权限才能拍照');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('提示', '需要相册权限才能选择图片');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setSelectedRegion(undefined);
      }
    } catch (e: any) {
      Alert.alert('图片选择失败', e?.message || '无法获取图片');
    }
  };

  const handleSubmit = () => {
    if (activeMode === 'text') {
      if (!textInput.trim()) {
        Alert.alert('提示', '请输入要查询的单词或短语');
        return;
      }
      onSearch({
        queryType: 'text',
        text: textInput.trim(),
      });
    } else if (activeMode === 'image') {
      if (!imageUri) {
        Alert.alert('提示', '请先拍照或从相册选择图片');
        return;
      }
      onSearch({
        queryType: 'image',
        imageUri,
        region: selectedRegion,
      });
    } else {
      // Both
      if (!imageUri && !textInput.trim()) {
        Alert.alert('提示', '请至少输入文字或选择一张图片');
        return;
      }
      onSearch({
        queryType: 'both',
        text: textInput.trim(),
        imageUri: imageUri || undefined,
        region: selectedRegion,
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Mode Selector Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.inputBg }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeMode === 'text' && { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
          onPress={() => setActiveMode('text')}
        >
          <Ionicons
            name="text-outline"
            size={16}
            color={activeMode === 'text' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeMode === 'text' ? colors.primary : colors.textSecondary,
                fontSize: 13 * fontScale,
              },
            ]}
          >
            文本查询
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeMode === 'image' && { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
          onPress={() => setActiveMode('image')}
        >
          <Ionicons
            name="image-outline"
            size={16}
            color={activeMode === 'image' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeMode === 'image' ? colors.primary : colors.textSecondary,
                fontSize: 13 * fontScale,
              },
            ]}
          >
            图片查询
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeMode === 'both' && { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
          onPress={() => setActiveMode('both')}
        >
          <Ionicons
            name="color-wand-outline"
            size={16}
            color={activeMode === 'both' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeMode === 'both' ? colors.primary : colors.textSecondary,
                fontSize: 13 * fontScale,
              },
            ]}
          >
            图文+提问
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input Bodies */}
      <View style={{ marginTop: 12 }}>
        {(activeMode === 'text' || activeMode === 'both') && (
          <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              value={textInput}
              onChangeText={setTextInput}
              placeholder={
                activeMode === 'text'
                  ? '输入英文单词或短语，如 serendipity, break a leg...'
                  : '可输入目标词汇、疑问或特定查询要求...'
              }
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                { color: colors.text, fontSize: 14 * fontScale, paddingVertical: 10 * spacingMultiplier },
              ]}
              autoCapitalize="none"
              onSubmitEditing={handleSubmit}
              returnKeyType="search"
            />
            {textInput.length > 0 && (
              <TouchableOpacity onPress={() => setTextInput('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {(activeMode === 'image' || activeMode === 'both') && (
          <View style={{ marginTop: activeMode === 'both' ? 10 : 0 }}>
            {imageUri ? (
              <RegionDrawer
                imageUri={imageUri}
                region={selectedRegion}
                onRegionChange={setSelectedRegion}
              />
            ) : (
              <View style={[styles.pickPlaceholder, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
                <Ionicons name="camera-outline" size={36} color={colors.textSecondary} />
                <Text style={[styles.pickPrompt, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
                  拍摄书籍/屏幕或选择相册图片
                </Text>
                <View style={styles.pickButtons}>
                  <Button
                    title="拍摄照片"
                    size="small"
                    variant="outline"
                    icon={<Ionicons name="camera" size={14} color={colors.text} />}
                    onPress={() => handlePickImage(true)}
                    style={{ marginRight: 10 }}
                  />
                  <Button
                    title="从相册选取"
                    size="small"
                    variant="outline"
                    icon={<Ionicons name="images" size={14} color={colors.text} />}
                    onPress={() => handlePickImage(false)}
                  />
                </View>
              </View>
            )}

            {imageUri && (
              <View style={styles.changeImageBar}>
                <TouchableOpacity
                  style={styles.repickBtn}
                  onPress={() => handlePickImage(false)}
                >
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                  <Text style={[styles.repickText, { color: colors.primary, fontSize: 12 * fontScale }]}>
                    换张图片
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.repickBtn}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                  <Text style={[styles.repickText, { color: colors.error, fontSize: 12 * fontScale }]}>
                    删除图片
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Submit Action */}
      <View style={styles.submitRow}>
        <Button
          title={loading ? '正在解析...' : '智能查询'}
          onPress={handleSubmit}
          loading={loading}
          icon={<Ionicons name="sparkles" size={16} color="#FFFFFF" />}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabText: {
    marginLeft: 5,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
  },
  pickPlaceholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  pickPrompt: {
    marginTop: 8,
    marginBottom: 14,
  },
  pickButtons: {
    flexDirection: 'row',
  },
  changeImageBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  repickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14,
  },
  repickText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  submitRow: {
    marginTop: 14,
    flexDirection: 'row',
  },
});
