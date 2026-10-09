import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useNotebooks } from '@/context/NotebookContext';
import { useHistory } from '@/context/HistoryContext';
import { BackupService } from '@/services/storage/backupService';
import { ACCENT_COLOR_PRESETS, GLOBAL_ROOT_NOTEBOOK_ID } from '@/constants/defaults';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

export default function ProfileScreen() {
  const {
    colors,
    isDark,
    themeMode,
    accentColor,
    fontSize,
    density,
    fontScale,
  } = useTheme();

  const {
    settings,
    providers,
    activeProvider,
    activeApiKey,
    updateSettings,
    updateProvider,
    setActiveApiKey,
    testActiveConnection,
  } = useSettings();

  const { notebooks, vocabularies, reloadAll } = useNotebooks();
  const { recentQueries, clearAllHistory, reloadHistory } = useHistory();

  // Local state for editing API Key
  const [apiKeyInput, setApiKeyInput] = useState(activeApiKey);
  const [showKey, setShowKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Custom Provider Inputs
  const [isCustomBaseUrl, setIsCustomBaseUrl] = useState(activeProvider.is_custom_base_url || false);
  const [customBaseUrl, setCustomBaseUrl] = useState(activeProvider.base_url);
  const [isCustomModelId, setIsCustomModelId] = useState(activeProvider.is_custom_model_id || false);
  const [customModelId, setCustomModelId] = useState(activeProvider.model_id);

  // Sync API Key input when provider changes
  React.useEffect(() => {
    setApiKeyInput(activeApiKey);
    setIsCustomBaseUrl(activeProvider.is_custom_base_url || false);
    setCustomBaseUrl(activeProvider.base_url);
    setIsCustomModelId(activeProvider.is_custom_model_id || false);
    setCustomModelId(activeProvider.model_id);
  }, [activeProvider, activeApiKey]);

  const handleSaveApiKey = async () => {
    await setActiveApiKey(apiKeyInput.trim());
    Alert.alert('已保存', 'API Key 已安全加密存储在本地安全存储区 (Keystore/SecureStore)');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    const result = await testActiveConnection();
    setTestingConnection(false);
    Alert.alert(result.success ? '连接成功' : '连接失败', result.message);
  };

  const handleUpdateCustomEndpoints = async () => {
    await updateProvider(activeProvider.id, {
      base_url: isCustomBaseUrl ? customBaseUrl.trim() : activeProvider.base_url,
      model_id: isCustomModelId ? customModelId.trim() : activeProvider.model_id,
      is_custom_base_url: isCustomBaseUrl,
      is_custom_model_id: isCustomModelId,
    });
    Alert.alert('已更新', '供应商服务地址与模型配置已更新');
  };

  const handleExportFullBackup = async () => {
    try {
      const backup = await BackupService.createFullBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      await Clipboard.setStringAsync(jsonStr);
      Alert.alert(
        '备份成功',
        `已生成完整数据备份并复制到剪贴板！\n包含 ${backup.vocabularies.length} 条词汇实体、${backup.notebooks.length} 个笔记树分类及最近 10 条查询记录。\n（已严格排除敏感 API Key）`
      );
    } catch (e: any) {
      Alert.alert('备份失败', e?.message);
    }
  };

  const handleRestoreFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (!clipboardContent) {
        Alert.alert('提示', '剪贴板内容为空，请先复制合法的备份 JSON 文本');
        return;
      }
      const parsed = JSON.parse(clipboardContent);
      Alert.alert('确认恢复数据', '导入备份将会合并或覆盖本地词库与笔记数据，是否继续？', [
        { text: '取消', style: 'cancel' },
        {
          text: '确定恢复',
          onPress: async () => {
            const result = await BackupService.restoreFullBackup(parsed);
            if (result.success) {
              await reloadAll();
              await reloadHistory();
              Alert.alert('恢复成功', result.message);
            } else {
              Alert.alert('恢复失败', result.message);
            }
          },
        },
      ]);
    } catch {
      Alert.alert('恢复失败', '剪贴板内容不是合法的 JSON 格式备份数据');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      {/* 1. LLM Provider Configuration */}
      <Card variant="elevated">
        <View style={styles.sectionHeader}>
          <Ionicons name="hardware-chip-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 * fontScale }]}>
            LLM 供应商与模型配置
          </Text>
        </View>

        {/* Provider Switcher Tabs */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
          选择预设供应商
        </Text>
        <View style={styles.providerGrid}>
          {providers.map((p) => {
            const isActive = p.id === activeProvider.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.providerChip,
                  {
                    backgroundColor: isActive ? colors.primaryLight : colors.inputBg,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => updateSettings({ active_provider_id: p.id })}
              >
                <Text
                  style={[
                    styles.providerChipText,
                    {
                      color: isActive ? colors.primary : colors.textSecondary,
                      fontSize: 12 * fontScale,
                    },
                  ]}
                >
                  {p.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Vision capability banner */}
        <View
          style={[
            styles.visionNotice,
            {
              backgroundColor: activeProvider.supports_vision
                ? `${colors.success}1A`
                : `${colors.warning}1A`,
            },
          ]}
        >
          <Ionicons
            name={activeProvider.supports_vision ? 'eye-outline' : 'alert-circle-outline'}
            size={16}
            color={activeProvider.supports_vision ? colors.success : colors.warning}
          />
          <Text
            style={[
              styles.visionNoticeText,
              {
                color: activeProvider.supports_vision ? colors.success : colors.warning,
                fontSize: 12 * fontScale,
              },
            ]}
          >
            {activeProvider.supports_vision
              ? '当前模型具备视觉理解能力，支持直接对图片提取与解析'
              : '提示：当前供应商为纯文本模型，图片查询将使用通用语境提取；如需高精度图片端到端理解可切换至支持视觉的模型'}
          </Text>
        </View>

        {/* API Key */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale, marginTop: 12 }]}>
          API Key (安全加密存储)
        </Text>
        <View style={[styles.keyInputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <TextInput
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            placeholder="sk-..."
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showKey}
            style={[styles.keyInput, { color: colors.text, fontSize: 13.5 * fontScale }]}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowKey(!showKey)} style={{ padding: 6 }}>
            <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.keyActions}>
          <Button
            title="保存密钥"
            size="small"
            onPress={handleSaveApiKey}
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title={testingConnection ? '测试中...' : '测试连接'}
            size="small"
            variant="outline"
            loading={testingConnection}
            onPress={handleTestConnection}
            style={{ flex: 1 }}
          />
        </View>

        {/* Custom Base URL & Model ID */}
        <View style={{ marginTop: 14 }}>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleText, { color: colors.text, fontSize: 13 * fontScale }]}>
              自定义 Base URL
            </Text>
            <Switch
              value={isCustomBaseUrl}
              onValueChange={setIsCustomBaseUrl}
              thumbColor={isCustomBaseUrl ? colors.primary : undefined}
            />
          </View>
          {isCustomBaseUrl && (
            <TextInput
              value={customBaseUrl}
              onChangeText={setCustomBaseUrl}
              placeholder="https://api.yourdomain.com/v1"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.endpointInput,
                { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border },
              ]}
              autoCapitalize="none"
            />
          )}

          <View style={[styles.toggleRow, { marginTop: 8 }]}>
            <Text style={[styles.toggleText, { color: colors.text, fontSize: 13 * fontScale }]}>
              自定义 Model ID
            </Text>
            <Switch
              value={isCustomModelId}
              onValueChange={setIsCustomModelId}
              thumbColor={isCustomModelId ? colors.primary : undefined}
            />
          </View>
          {isCustomModelId && (
            <TextInput
              value={customModelId}
              onChangeText={setCustomModelId}
              placeholder="例如：deepseek-chat / gpt-4o-mini"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.endpointInput,
                { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border },
              ]}
              autoCapitalize="none"
            />
          )}

          {(isCustomBaseUrl || isCustomModelId) && (
            <Button
              title="保存自定义地址与模型"
              size="small"
              variant="outline"
              onPress={handleUpdateCustomEndpoints}
              style={{ marginTop: 10 }}
            />
          )}
        </View>
      </Card>

      {/* 2. Appearance Settings */}
      <Card variant="elevated">
        <View style={styles.sectionHeader}>
          <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 * fontScale }]}>
            外观与显示设置
          </Text>
        </View>

        {/* Theme mode */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
          主题模式
        </Text>
        <View style={styles.optionButtonGroup}>
          {[
            { id: 'light', name: '浅色' },
            { id: 'dark', name: '深色' },
            { id: 'system', name: '跟随系统' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.optionBtn,
                themeMode === item.id && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => updateSettings({ theme_mode: item.id as any })}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  { color: themeMode === item.id ? colors.primary : colors.textSecondary },
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Accent Color presets */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale, marginTop: 12 }]}>
          主题强调色
        </Text>
        <View style={styles.colorPresetsRow}>
          {ACCENT_COLOR_PRESETS.map((color) => {
            const isSelected = accentColor === color.value;
            return (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color.value },
                  isSelected && styles.colorCircleSelected,
                ]}
                onPress={() => updateSettings({ accent_color: color.value })}
              >
                {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Font size */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale, marginTop: 12 }]}>
          字号大小
        </Text>
        <View style={styles.optionButtonGroup}>
          {[
            { id: 'small', name: '小' },
            { id: 'medium', name: '标准' },
            { id: 'large', name: '大' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.optionBtn,
                fontSize === item.id && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => updateSettings({ font_size: item.id as any })}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  { color: fontSize === item.id ? colors.primary : colors.textSecondary },
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Density */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale, marginTop: 12 }]}>
          显示密度
        </Text>
        <View style={styles.optionButtonGroup}>
          {[
            { id: 'comfortable', name: '舒适' },
            { id: 'compact', name: '紧凑' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.optionBtn,
                density === item.id && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => updateSettings({ density: item.id as any })}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  { color: density === item.id ? colors.primary : colors.textSecondary },
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* 3. Query & Record Preferences */}
      <Card variant="elevated">
        <View style={styles.sectionHeader}>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 * fontScale }]}>
            查询与自动记录偏好
          </Text>
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.toggleText, { color: colors.text, fontSize: 13.5 * fontScale }]}>
              查询结果自动记录到默认笔记
            </Text>
            <Text style={[styles.subNote, { color: colors.textSecondary, fontSize: 11.5 * fontScale }]}>
              开启后，每次查询完毕将自动写入默认笔记分类
            </Text>
          </View>
          <Switch
            value={settings.auto_record_extra_info}
            onValueChange={(val) => updateSettings({ auto_record_extra_info: val })}
            thumbColor={settings.auto_record_extra_info ? colors.primary : undefined}
          />
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale, marginTop: 12 }]}>
          默认笔记存储分类
        </Text>
        <View style={styles.notebookSelectRow}>
          {notebooks
            .filter((n) => n.id !== GLOBAL_ROOT_NOTEBOOK_ID)
            .map((nb) => {
              const isDefault = settings.default_notebook_id === nb.id;
              return (
                <TouchableOpacity
                  key={nb.id}
                  style={[
                    styles.providerChip,
                    {
                      backgroundColor: isDefault ? colors.primaryLight : colors.inputBg,
                      borderColor: isDefault ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => updateSettings({ default_notebook_id: nb.id })}
                >
                  <Text
                    style={{
                      color: isDefault ? colors.primary : colors.textSecondary,
                      fontWeight: '600',
                      fontSize: 12 * fontScale,
                    }}
                  >
                    {nb.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </View>
      </Card>

      {/* 4. Data Management & Backup */}
      <Card variant="elevated">
        <View style={styles.sectionHeader}>
          <Ionicons name="server-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 * fontScale }]}>
            数据管理与全量备份
          </Text>
        </View>

        {/* Local Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.inputBg }]}>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.primary, fontSize: 18 * fontScale }]}>
              {Object.keys(vocabularies).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>
              已存词汇
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.text, fontSize: 18 * fontScale }]}>
              {notebooks.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>
              笔记分类
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.text, fontSize: 18 * fontScale }]}>
              {recentQueries.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>
              查询快照
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Button
            title="一键全量备份 (复制 JSON)"
            variant="primary"
            onPress={handleExportFullBackup}
            icon={<Ionicons name="download-outline" size={16} color="#FFFFFF" />}
            style={{ marginBottom: 8 }}
          />

          <Button
            title="从剪贴板恢复完整备份"
            variant="outline"
            onPress={handleRestoreFromClipboard}
            icon={<Ionicons name="push-outline" size={16} color={colors.text} />}
            style={{ marginBottom: 8 }}
          />

          <Button
            title="清空最近 10 条查询快照"
            variant="ghost"
            onPress={() => {
              Alert.alert('清空确认', '确定清空所有最近查询历史快照吗？', [
                { text: '取消', style: 'cancel' },
                { text: '清空', style: 'destructive', onPress: clearAllHistory },
              ]);
            }}
            icon={<Ionicons name="trash-outline" size={16} color={colors.error} />}
            textStyle={{ color: colors.error }}
          />
        </View>
      </Card>

      {/* App Info Footer */}
      <View style={styles.appFooter}>
        <Text style={[styles.appFooterText, { color: colors.textTertiary, fontSize: 12 * fontScale }]}>
          LexiNote v1.1 · 本地优先 · Android 体验优先
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    marginLeft: 8,
  },
  fieldLabel: {
    fontWeight: '600',
    marginBottom: 6,
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  providerChipText: {
    fontWeight: '600',
  },
  visionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  visionNoticeText: {
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  keyInput: {
    flex: 1,
    paddingVertical: 8,
  },
  keyActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleText: {
    fontWeight: '500',
  },
  subNote: {
    marginTop: 2,
  },
  endpointInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 4,
    fontSize: 13,
  },
  optionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  optionBtnText: {
    fontWeight: '600',
  },
  colorPresetsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  notebookSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
  },
  appFooter: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appFooterText: {
    fontWeight: '500',
  },
});
