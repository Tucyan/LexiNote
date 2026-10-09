import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useNotebooks } from '@/context/NotebookContext';
import { Vocabulary, Notebook, ChildrenType } from '@/types';
import { VocabularyItem } from '@/components/notebook/VocabularyItem';
import { ExportModal } from '@/components/notebook/ExportModal';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { GLOBAL_ROOT_NOTEBOOK_ID } from '@/constants/defaults';

export default function NotebooksScreen() {
  const { colors, fontScale } = useTheme();
  const router = useRouter();
  const {
    notebooks,
    vocabularies,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    deleteVocabulary,
  } = useNotebooks();

  // Active selected notebook tab (default to Global Root "全部词汇")
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>(GLOBAL_ROOT_NOTEBOOK_ID);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'word' | 'phrase'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modals
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookParentId, setNewNotebookParentId] = useState<string | null>(null);
  const [newNotebookChildrenType, setNewNotebookChildrenType] = useState<ChildrenType>('vocabulary');

  // Currently active notebook object
  const activeNotebook =
    notebooks.find((n) => n.id === selectedNotebookId) || notebooks[0];

  // All tags collected across all vocabularies
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    Object.values(vocabularies).forEach((v) => {
      v.tags?.forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [vocabularies]);

  // Vocabularies belonging to the active notebook
  const notebookVocabularies = useMemo(() => {
    if (!activeNotebook) return [];
    if (activeNotebook.id === GLOBAL_ROOT_NOTEBOOK_ID) {
      return Object.values(vocabularies);
    }
    return activeNotebook.vocabulary_ids
      .map((id) => vocabularies[id])
      .filter(Boolean);
  }, [activeNotebook, vocabularies]);

  // Filtered list based on search, type, and tags
  const filteredVocabularies = useMemo(() => {
    return notebookVocabularies.filter((v) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchWord = v.content.toLowerCase().includes(q);
        const matchMeaning = v.meanings.some(
          (m) =>
            (m.zh_definition && m.zh_definition.toLowerCase().includes(q)) ||
            (m.en_definition && m.en_definition.toLowerCase().includes(q))
        );
        if (!matchWord && !matchMeaning) return false;
      }

      // Type filter
      if (selectedType !== 'all' && v.type !== selectedType) {
        return false;
      }

      // Tag filter
      if (selectedTag && (!v.tags || !v.tags.includes(selectedTag))) {
        return false;
      }

      return true;
    });
  }, [notebookVocabularies, searchQuery, selectedType, selectedTag]);

  // Child sub-notebooks if active notebook has children_type === 'notebook'
  const childNotebooks = useMemo(() => {
    if (!activeNotebook || activeNotebook.children_type !== 'notebook') return [];
    return notebooks.filter((n) => n.parent_id === activeNotebook.id);
  }, [activeNotebook, notebooks]);

  const handleCreateNotebook = async () => {
    if (!newNotebookName.trim()) {
      Alert.alert('提示', '请输入笔记名称');
      return;
    }
    try {
      const created = await createNotebook(
        newNotebookName.trim(),
        newNotebookParentId,
        newNotebookChildrenType
      );
      setCreateModalVisible(false);
      setNewNotebookName('');
      setSelectedNotebookId(created.id);
    } catch (e: any) {
      Alert.alert('创建失败', e?.message);
    }
  };

  const handleDeleteNotebook = (nb: Notebook) => {
    if (nb.is_global_root || nb.is_default) {
      Alert.alert('无法删除', '系统预置的全部词汇视图和默认笔记不允许删除');
      return;
    }
    Alert.alert(
      '删除笔记',
      `确定要删除笔记「${nb.name}」吗？（笔记中的词汇实体仍会完整保留在全部词汇中）`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteNotebook(nb.id);
            setSelectedNotebookId(GLOBAL_ROOT_NOTEBOOK_ID);
          },
        },
      ]
    );
  };

  const handleDeleteVocab = (vocab: Vocabulary) => {
    const isGlobal = activeNotebook.id === GLOBAL_ROOT_NOTEBOOK_ID;
    const alertMsg = isGlobal
      ? `确定要彻底删除词汇「${vocab.content}」吗？该词汇在所有笔记分类中的引用也将一并清除。`
      : `确定从当前笔记「${activeNotebook.name}」中移除「${vocab.content}」吗？（词汇仍保留在其他笔记和全部词汇中）`;

    Alert.alert('确认删除', alertMsg, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          deleteVocabulary(vocab.id, isGlobal ? undefined : activeNotebook.id);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar & Export Entry */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="搜索词汇、含义或例句..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text, fontSize: 13.5 * fontScale }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.primaryLight }]}
          onPress={() => setExportModalVisible(true)}
        >
          <Ionicons name="share-outline" size={16} color={colors.primary} />
          <Text style={[styles.exportBtnText, { color: colors.primary, fontSize: 12.5 * fontScale }]}>
            导出
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notebooks Horizontal Selector & Add Notebook Button */}
      <View style={[styles.notebookNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={notebooks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedNotebookId;
            return (
              <TouchableOpacity
                style={[
                  styles.notebookTab,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.inputBg,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedNotebookId(item.id)}
                onLongPress={() => handleDeleteNotebook(item)}
              >
                <Ionicons
                  name={
                    item.is_global_root
                      ? 'planet-outline'
                      : item.children_type === 'notebook'
                      ? 'folder-outline'
                      : 'book-outline'
                  }
                  size={14}
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.notebookTabText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.text,
                      fontSize: 12.5 * fontScale,
                    },
                  ]}
                >
                  {item.name}
                  {item.is_global_root
                    ? ` (${Object.keys(vocabularies).length})`
                    : ` (${item.vocabulary_ids?.length || 0})`}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <TouchableOpacity
              style={[styles.addNotebookBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => {
                setNewNotebookParentId(null);
                setCreateModalVisible(true);
              }}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.addNotebookText, { color: colors.primary, fontSize: 12 * fontScale }]}>
                新建分类
              </Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* Filter Chips: Type (All/Word/Phrase) & Tags */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        <View style={styles.typeFilterGroup}>
          {(['all', 'word', 'phrase'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeFilterBtn,
                selectedType === t && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedType(t)}
            >
              <Text
                style={[
                  styles.typeFilterText,
                  {
                    color: selectedType === t ? colors.primary : colors.textSecondary,
                    fontSize: 11.5 * fontScale,
                  },
                ]}
              >
                {t === 'all' ? '全部' : t === 'word' ? '单词' : '短语'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {allTags.length > 0 && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['全部标签', ...allTags]}
            keyExtractor={(item) => item}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 6 }}
            renderItem={({ item }) => {
              const isSelected = item === '全部标签' ? selectedTag === null : selectedTag === item;
              return (
                <TouchableOpacity
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: isSelected ? colors.primaryLight : colors.inputBg,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedTag(item === '全部标签' ? null : item)}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontSize: 11 * fontScale,
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Main Vocabulary List or Sub-notebooks List */}
      <FlatList
        data={filteredVocabularies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 50 }}
        ListHeaderComponent={
          childNotebooks.length > 0 ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 12.5 * fontScale }]}>
                子笔记目录 ({childNotebooks.length})
              </Text>
              <View style={styles.childGrid}>
                {childNotebooks.map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.childCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setSelectedNotebookId(sub.id)}
                  >
                    <Ionicons name="folder" size={20} color={colors.primary} />
                    <Text style={[styles.childName, { color: colors.text, fontSize: 13 * fontScale }]}>
                      {sub.name}
                    </Text>
                    <Text style={[styles.childCount, { color: colors.textTertiary, fontSize: 11 * fontScale }]}>
                      {sub.vocabulary_ids.length} 词
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <VocabularyItem
            vocabulary={item}
            onPress={() => {
              router.push({
                pathname: '/vocabulary/[id]',
                params: { id: item.id },
              });
            }}
            onDelete={() => handleDeleteVocab(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontSize: 15 * fontScale }]}>
              {searchQuery ? '未找到匹配的词汇' : '此分类暂无词汇记录'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary, fontSize: 12.5 * fontScale }]}>
              在「查询和记录」页面查询后，点击整理笔记即可保存到此处。
            </Text>
          </View>
        }
      />

      {/* Create Notebook Modal */}
      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.createDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.dialogTitle, { color: colors.text, fontSize: 17 * fontScale }]}>
              新建笔记分类
            </Text>

            <Text style={[styles.dialogLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
              笔记名称
            </Text>
            <TextInput
              value={newNotebookName}
              onChangeText={setNewNotebookName}
              placeholder="如：GRE核心高频、生活口语、学术论文..."
              placeholderTextColor={colors.textMuted}
              style={[styles.dialogInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
            />

            <Text style={[styles.dialogLabel, { color: colors.textSecondary, fontSize: 12 * fontScale, marginTop: 10 }]}>
              子节点类型（同一父节点下必须一致）
            </Text>
            <View style={styles.dialogTypeRow}>
              <TouchableOpacity
                style={[
                  styles.dialogTypeBtn,
                  newNotebookChildrenType === 'vocabulary' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
                onPress={() => setNewNotebookChildrenType('vocabulary')}
              >
                <Text style={{ color: newNotebookChildrenType === 'vocabulary' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
                  存放词汇节点
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dialogTypeBtn,
                  newNotebookChildrenType === 'notebook' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
                onPress={() => setNewNotebookChildrenType('notebook')}
              >
                <Text style={{ color: newNotebookChildrenType === 'notebook' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
                  嵌套子目录
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dialogActions}>
              <Button
                title="取消"
                variant="outline"
                size="small"
                onPress={() => setCreateModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="创建"
                variant="primary"
                size="small"
                onPress={handleCreateNotebook}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <ExportModal
        visible={exportModalVisible}
        vocabularies={filteredVocabularies}
        notebookName={activeNotebook?.name}
        onClose={() => setExportModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  exportBtnText: {
    marginLeft: 4,
    fontWeight: '700',
  },
  notebookNav: {
    borderBottomWidth: 1,
  },
  notebookTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  notebookTabText: {
    marginLeft: 5,
    fontWeight: '600',
  },
  addNotebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  addNotebookText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  typeFilterGroup: {
    flexDirection: 'row',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingRight: 8,
    marginRight: 4,
  },
  typeFilterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 4,
  },
  typeFilterText: {
    fontWeight: '600',
  },
  tagChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagChipText: {
    fontWeight: '500',
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  childGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    width: '48%',
  },
  childName: {
    marginLeft: 8,
    flex: 1,
    fontWeight: '600',
  },
  childCount: {
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySub: {
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  createDialog: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  dialogTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  dialogLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  dialogInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dialogTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  dialogTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dialogActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
