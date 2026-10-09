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
import { EditNotebookModal } from '@/components/notebook/EditNotebookModal';
import { QuickEditVocabModal } from '@/components/notebook/QuickEditVocabModal';
import { BatchMoveModal } from '@/components/notebook/BatchMoveModal';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { GLOBAL_ROOT_NOTEBOOK_ID, DEFAULT_NOTEBOOK_ID } from '@/constants/defaults';

export default function NotebooksScreen() {
  const { colors, fontScale } = useTheme();
  const router = useRouter();
  const {
    notebooks,
    vocabularies,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    saveVocabulary,
    deleteVocabulary,
    batchDeleteVocabularies,
    batchAddVocabulariesToNotebook,
  } = useNotebooks();

  // Active selected notebook tab (default to Global Root "全部词汇")
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>(GLOBAL_ROOT_NOTEBOOK_ID);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'word' | 'phrase'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modals state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookParentId, setNewNotebookParentId] = useState<string | null>(null);
  const [newNotebookChildrenType, setNewNotebookChildrenType] = useState<ChildrenType>('vocabulary');

  // Notebook Edit & Management Modal
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);

  // Vocabulary Quick Edit Modal
  const [editingVocab, setEditingVocab] = useState<Vocabulary | null>(null);

  // Batch Mode State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedVocabIds, setSelectedVocabIds] = useState<string[]>([]);
  const [batchMoveModalVisible, setBatchMoveModalVisible] = useState(false);

  // Currently active notebook object
  const activeNotebook =
    notebooks.find((n) => n.id === selectedNotebookId) || notebooks[0] || {
      id: GLOBAL_ROOT_NOTEBOOK_ID,
      name: '全部词汇',
      is_global_root: true,
      vocabulary_ids: [],
      child_notebook_ids: [],
      children_type: 'vocabulary' as ChildrenType,
    };

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

  // --- Category Actions ---
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
      Alert.alert('创建失败', e?.message || '未知错误');
    }
  };

  const handleSaveNotebookName = async (newName: string) => {
    if (!editingNotebook) return;
    await updateNotebook(editingNotebook.id, { name: newName });
  };

  const handleDeleteNotebook = (nb: Notebook) => {
    if (nb.is_global_root || nb.is_default || nb.id === GLOBAL_ROOT_NOTEBOOK_ID || nb.id === DEFAULT_NOTEBOOK_ID) {
      Alert.alert('无法删除', '系统预置的「全部词汇」视图和「默认笔记」不允许删除');
      return;
    }
    Alert.alert(
      '删除笔记分类',
      `确定要删除笔记分类「${nb.name}」吗？\n（提示：分类内的词汇实体仍完整保留在全局词库和其他笔记中）`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认删除',
          style: 'destructive',
          onPress: async () => {
            await deleteNotebook(nb.id);
            if (selectedNotebookId === nb.id) {
              setSelectedNotebookId(GLOBAL_ROOT_NOTEBOOK_ID);
            }
          },
        },
      ]
    );
  };

  // --- Vocabulary Actions ---
  const handleDeleteVocab = (vocab: Vocabulary) => {
    const isGlobal = activeNotebook.id === GLOBAL_ROOT_NOTEBOOK_ID;

    if (isGlobal) {
      Alert.alert(
        '彻底删除词汇',
        `确定要彻底从词库中删除「${vocab.content}」吗？\n该词汇在所有笔记分类中的引用与批注也将一并永久清除。`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '彻底删除',
            style: 'destructive',
            onPress: () => deleteVocabulary(vocab.id),
          },
        ]
      );
    } else {
      Alert.alert(
        '删除或移除词汇',
        `请选择对词汇「${vocab.content}」的处理方式：`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '仅从当前笔记移除',
            onPress: () => deleteVocabulary(vocab.id, activeNotebook.id),
          },
          {
            text: '彻底从词库删除',
            style: 'destructive',
            onPress: () => deleteVocabulary(vocab.id),
          },
        ]
      );
    }
  };

  const handleSaveVocabEdit = async (updatedVocab: Vocabulary, targetNotebookIds: string[]) => {
    await saveVocabulary(updatedVocab, {
      targetNotebookIds,
      mergeExisting: true,
    });
  };

  // --- Batch Mode Actions ---
  const handleToggleSelectVocab = (id: string) => {
    setSelectedVocabIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedVocabIds.length === filteredVocabularies.length) {
      setSelectedVocabIds([]);
    } else {
      setSelectedVocabIds(filteredVocabularies.map((v) => v.id));
    }
  };

  const handleBatchRemoveFromCurrent = async () => {
    if (selectedVocabIds.length === 0) return;
    Alert.alert(
      '批量移除',
      `确定将选中的 ${selectedVocabIds.length} 个词汇从「${activeNotebook.name}」中移除吗？（词汇仍保留在其他笔记和全部词汇中）`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认移除',
          style: 'destructive',
          onPress: async () => {
            await batchDeleteVocabularies(selectedVocabIds, activeNotebook.id);
            setSelectedVocabIds([]);
            setIsSelectMode(false);
          },
        },
      ]
    );
  };

  const handleBatchDeletePermanently = async () => {
    if (selectedVocabIds.length === 0) return;
    Alert.alert(
      '批量彻底删除',
      `⚠️ 高风险操作：确定彻底从词库中删除选中的 ${selectedVocabIds.length} 个词汇吗？所有分类中的引用均将被清除，不可恢复！`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '彻底删除',
          style: 'destructive',
          onPress: async () => {
            await batchDeleteVocabularies(selectedVocabIds);
            setSelectedVocabIds([]);
            setIsSelectMode(false);
          },
        },
      ]
    );
  };

  const handleBatchMoveConfirm = async (targetNotebookId: string) => {
    await batchAddVocabulariesToNotebook(selectedVocabIds, targetNotebookId);
    setSelectedVocabIds([]);
    setIsSelectMode(false);
    Alert.alert('归类成功', `已将所选词汇添加至目标笔记`);
  };

  const isGlobalActive = activeNotebook.id === GLOBAL_ROOT_NOTEBOOK_ID;
  const isDefaultActive = activeNotebook.id === DEFAULT_NOTEBOOK_ID;

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
                onPress={() => {
                  setSelectedNotebookId(item.id);
                  if (isSelectMode) setSelectedVocabIds([]);
                }}
                onLongPress={() => setEditingNotebook(item)}
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

      {/* Active Category Header & Quick Action Bar */}
      <View style={[styles.activeCategoryBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.activeCatLeft}>
          <Ionicons
            name={isGlobalActive ? 'planet' : activeNotebook.children_type === 'notebook' ? 'folder' : 'book'}
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.activeCatName, { color: colors.text, fontSize: 14.5 * fontScale }]}>
            {activeNotebook.name}
          </Text>
          <Badge
            label={
              isGlobalActive
                ? '全部词库'
                : isDefaultActive
                ? '默认分类'
                : activeNotebook.children_type === 'notebook'
                ? '目录文件夹'
                : '自定义'
            }
            variant="neutral"
            size="small"
            style={{ marginLeft: 6 }}
          />
        </View>

        {/* Action icons for current notebook */}
        <View style={styles.activeCatActions}>
          {/* Edit/Rename category */}
          <TouchableOpacity
            style={[styles.catActionBtn, { backgroundColor: colors.inputBg }]}
            onPress={() => setEditingNotebook(activeNotebook)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="create-outline" size={15} color={colors.text} />
            <Text style={[styles.catActionBtnText, { color: colors.text, fontSize: 11.5 * fontScale }]}>
              {isGlobalActive ? '信息' : '编辑分类'}
            </Text>
          </TouchableOpacity>

          {/* Add Subcategory (if folder or allow nesting) */}
          {!isGlobalActive && (
            <TouchableOpacity
              style={[styles.catActionBtn, { backgroundColor: colors.inputBg }]}
              onPress={() => {
                setNewNotebookParentId(activeNotebook.id);
                setNewNotebookChildrenType('vocabulary');
                setCreateModalVisible(true);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={15} color={colors.primary} />
              <Text style={[styles.catActionBtnText, { color: colors.primary, fontSize: 11.5 * fontScale }]}>
                子分类
              </Text>
            </TouchableOpacity>
          )}

          {/* Toggle Batch Select Mode */}
          <TouchableOpacity
            style={[
              styles.catActionBtn,
              { backgroundColor: isSelectMode ? colors.primaryLight : colors.inputBg },
            ]}
            onPress={() => {
              setIsSelectMode(!isSelectMode);
              setSelectedVocabIds([]);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name={isSelectMode ? 'checkmark-done-circle' : 'list-outline'}
              size={15}
              color={isSelectMode ? colors.primary : colors.text}
            />
            <Text
              style={[
                styles.catActionBtnText,
                { color: isSelectMode ? colors.primary : colors.text, fontSize: 11.5 * fontScale },
              ]}
            >
              {isSelectMode ? '退出多选' : '批量管理'}
            </Text>
          </TouchableOpacity>
        </View>
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
        contentContainerStyle={{
          padding: 14,
          paddingBottom: isSelectMode ? 90 : 50,
        }}
        ListHeaderComponent={
          childNotebooks.length > 0 ? (
            <View style={{ marginBottom: 12 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 12.5 * fontScale }]}>
                  子笔记目录 ({childNotebooks.length})
                </Text>
              </View>
              <View style={styles.childGrid}>
                {childNotebooks.map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.childCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setSelectedNotebookId(sub.id)}
                    onLongPress={() => setEditingNotebook(sub)}
                  >
                    <View style={styles.childTop}>
                      <Ionicons name="folder" size={20} color={colors.primary} />
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setEditingNotebook(sub);
                        }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="ellipsis-vertical" size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <Text numberOfLines={1} style={[styles.childName, { color: colors.text, fontSize: 13 * fontScale }]}>
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
            isSelectMode={isSelectMode}
            isSelected={selectedVocabIds.includes(item.id)}
            onToggleSelect={() => handleToggleSelectVocab(item.id)}
            onPress={() => {
              router.push({
                pathname: '/vocabulary/[id]',
                params: { id: item.id },
              });
            }}
            onEdit={() => setEditingVocab(item)}
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

      {/* Batch Operation Floating Bottom Bar */}
      {isSelectMode && (
        <View style={[styles.batchBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.batchInfoRow}>
            <TouchableOpacity onPress={handleSelectAll} style={styles.selectAllBtn}>
              <Ionicons
                name={
                  selectedVocabIds.length === filteredVocabularies.length && filteredVocabularies.length > 0
                    ? 'checkbox'
                    : 'square-outline'
                }
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.batchCountText, { color: colors.text, fontSize: 12.5 * fontScale }]}>
                {selectedVocabIds.length === filteredVocabularies.length && filteredVocabularies.length > 0
                  ? '取消全选'
                  : '全选'}
                ({selectedVocabIds.length}/{filteredVocabularies.length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.batchActionsRow}>
            <TouchableOpacity
              style={[
                styles.batchBtn,
                { backgroundColor: colors.primaryLight, opacity: selectedVocabIds.length > 0 ? 1 : 0.4 },
              ]}
              disabled={selectedVocabIds.length === 0}
              onPress={() => setBatchMoveModalVisible(true)}
            >
              <Ionicons name="folder-outline" size={14} color={colors.primary} />
              <Text style={[styles.batchBtnText, { color: colors.primary, fontSize: 11.5 * fontScale }]}>
                归类到...
              </Text>
            </TouchableOpacity>

            {!isGlobalActive && (
              <TouchableOpacity
                style={[
                  styles.batchBtn,
                  { backgroundColor: colors.inputBg, opacity: selectedVocabIds.length > 0 ? 1 : 0.4 },
                ]}
                disabled={selectedVocabIds.length === 0}
                onPress={handleBatchRemoveFromCurrent}
              >
                <Ionicons name="remove-circle-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.batchBtnText, { color: colors.textSecondary, fontSize: 11.5 * fontScale }]}>
                  从本类移除
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.batchBtn,
                { backgroundColor: 'rgba(239, 68, 68, 0.12)', opacity: selectedVocabIds.length > 0 ? 1 : 0.4 },
              ]}
              disabled={selectedVocabIds.length === 0}
              onPress={handleBatchDeletePermanently}
            >
              <Ionicons name="trash-outline" size={14} color={colors.error} />
              <Text style={[styles.batchBtnText, { color: colors.error, fontSize: 11.5 * fontScale }]}>
                彻底删除
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Create Notebook Modal */}
      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.createDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.dialogTitle, { color: colors.text, fontSize: 17 * fontScale }]}>
              {newNotebookParentId ? `新建「${activeNotebook.name}」的子分类` : '新建笔记分类'}
            </Text>

            <Text style={[styles.dialogLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
              分类名称
            </Text>
            <TextInput
              value={newNotebookName}
              onChangeText={setNewNotebookName}
              placeholder="如：GRE核心高频、生活口语、学术论文..."
              placeholderTextColor={colors.textMuted}
              style={[styles.dialogInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
              autoFocus
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
                <Text style={{ color: newNotebookChildrenType === 'vocabulary' ? colors.primary : colors.textSecondary, fontWeight: '600', fontSize: 12 * fontScale }}>
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
                <Text style={{ color: newNotebookChildrenType === 'notebook' ? colors.primary : colors.textSecondary, fontWeight: '600', fontSize: 12 * fontScale }}>
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

      {/* Edit Notebook Category Modal */}
      <EditNotebookModal
        visible={!!editingNotebook}
        notebook={editingNotebook}
        onClose={() => setEditingNotebook(null)}
        onSave={handleSaveNotebookName}
        onDelete={handleDeleteNotebook}
      />

      {/* Quick Edit Vocabulary Modal */}
      <QuickEditVocabModal
        visible={!!editingVocab}
        vocabulary={editingVocab}
        notebooks={notebooks}
        onClose={() => setEditingVocab(null)}
        onSave={handleSaveVocabEdit}
        onDelete={handleDeleteVocab}
      />

      {/* Batch Move Modal */}
      <BatchMoveModal
        visible={batchMoveModalVisible}
        selectedCount={selectedVocabIds.length}
        notebooks={notebooks}
        currentNotebookId={activeNotebook.id}
        onClose={() => setBatchMoveModalVisible(false)}
        onConfirm={handleBatchMoveConfirm}
      />

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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    padding: 0,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 8,
  },
  exportBtnText: {
    fontWeight: '600',
    marginLeft: 4,
  },
  notebookNav: {
    borderBottomWidth: 1,
  },
  notebookTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  notebookTabText: {
    fontWeight: '600',
  },
  addNotebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 2,
  },
  addNotebookText: {
    fontWeight: '600',
  },
  activeCategoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  activeCatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activeCatName: {
    fontWeight: '700',
    marginLeft: 6,
  },
  activeCatActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 3,
  },
  catActionBtnText: {
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  typeFilterGroup: {
    flexDirection: 'row',
    marginRight: 6,
  },
  typeFilterBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeFilterText: {
    fontWeight: '600',
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagChipText: {
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  childGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  childCard: {
    width: '48%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  childTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  childName: {
    fontWeight: '600',
    marginTop: 4,
  },
  childCount: {
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontWeight: '600',
    marginTop: 12,
  },
  emptySub: {
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 30,
  },
  batchBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  batchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  batchCountText: {
    fontWeight: '600',
  },
  batchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  batchBtnText: {
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  createDialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  dialogTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  dialogLabel: {
    fontWeight: '600',
    marginBottom: 6,
  },
  dialogInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dialogTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dialogTypeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
