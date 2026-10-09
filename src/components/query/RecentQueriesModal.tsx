import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { QueryHistory } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { useHistory } from '@/context/HistoryContext';
import { formatRelativeTime } from '@/utils/date';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Ionicons } from '@expo/vector-icons';

interface RecentQueriesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectQuery: (query: QueryHistory) => void;
}

export function RecentQueriesModal({
  visible,
  onClose,
  onSelectQuery,
}: RecentQueriesModalProps) {
  const { colors, fontScale } = useTheme();
  const { recentQueries, deleteQueryHistory, clearAllHistory } = useHistory();

  const handleClearAll = () => {
    Alert.alert('确认清空', '确定要清空全部最近查询记录吗？（已保存的词库笔记不会受影响）', [
      { text: '取消', style: 'cancel' },
      { text: '清空', style: 'destructive', onPress: clearAllHistory },
    ]);
  };

  const handleDeleteItem = (id: string, e: any) => {
    e.stopPropagation();
    deleteQueryHistory(id);
  };

  const getQueryTypeBadge = (type: QueryHistory['query_type']) => {
    switch (type) {
      case 'image':
        return <Badge label="图片" variant="warning" size="small" />;
      case 'both':
        return <Badge label="图文" variant="primary" size="small" />;
      case 'text':
      default:
        return <Badge label="文本" variant="neutral" size="small" />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time-outline" size={20} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.title, { color: colors.text, fontSize: 17 * fontScale }]}>
                最近查询历史 ({recentQueries.length}/10)
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {recentQueries.length > 0 && (
                <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                  <Text style={[styles.clearBtnText, { color: colors.error, fontSize: 13 * fontScale }]}>
                    清空
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          {recentQueries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 14 * fontScale }]}>
                暂无查询记录
              </Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary, fontSize: 12 * fontScale }]}>
                进行文本或图片查询后，此处将自动保留最近 10 条完整快照
              </Text>
            </View>
          ) : (
            <FlatList
              data={recentQueries}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 14 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelectQuery(item);
                    onClose();
                  }}
                >
                  <Card variant="outlined" style={styles.itemCard}>
                    <View style={styles.itemTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {getQueryTypeBadge(item.query_type)}
                        <Text
                          numberOfLines={1}
                          style={[styles.itemWord, { color: colors.text, fontSize: 16 * fontScale }]}
                        >
                          {item.query_results?.word || item.input_text || '未命名查询'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.itemTime, { color: colors.textTertiary, fontSize: 11 * fontScale }]}>
                          {formatRelativeTime(item.created_at)}
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={(e) => handleDeleteItem(item.id, e)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Snapshot info */}
                    {item.query_results?.meanings?.[0]?.zh_definition ? (
                      <Text
                        numberOfLines={1}
                        style={[styles.itemDef, { color: colors.textSecondary, fontSize: 13 * fontScale }]}
                      >
                        {item.query_results.meanings[0].zh_definition}
                      </Text>
                    ) : null}

                    <View style={styles.itemFooter}>
                      {item.saved_content?.saved ? (
                        <Badge label="已存入笔记" variant="success" size="small" />
                      ) : (
                        <Badge label="未保存草稿" variant="neutral" size="small" />
                      )}

                      {item.ai_messages && item.ai_messages.length > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                          <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.primary} />
                          <Text style={[styles.chatCount, { color: colors.primary, fontSize: 11 * fontScale }]}>
                            {item.ai_messages.length} 条对话
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Card>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '80%',
    minHeight: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: '700',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  clearBtnText: {
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyText: {
    fontWeight: '600',
    marginTop: 12,
  },
  emptySub: {
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  itemCard: {
    marginBottom: 8,
    padding: 12,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemWord: {
    fontWeight: '700',
    marginLeft: 6,
  },
  itemTime: {
    marginRight: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  itemDef: {
    marginTop: 6,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  chatCount: {
    marginLeft: 4,
    fontWeight: '500',
  },
});
