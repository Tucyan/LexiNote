import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Vocabulary } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Ionicons } from '@expo/vector-icons';
import { formatPhonetic } from '@/utils/phonetic';

interface VocabularyItemProps {
  vocabulary: Vocabulary;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function VocabularyItem({
  vocabulary,
  onPress,
  onEdit,
  onDelete,
  showDelete = true,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: VocabularyItemProps) {
  const { colors, fontScale } = useTheme();

  const primaryMeaning = vocabulary.meanings[0];
  const totalAnnotations = vocabulary.meanings.reduce(
    (acc, m) => acc + (m.annotations ? m.annotations.length : 0),
    0
  );

  const handlePress = () => {
    if (isSelectMode && onToggleSelect) {
      onToggleSelect();
    } else {
      onPress();
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
      <Card
        variant="outlined"
        style={[
          styles.card,
          isSelected && {
            borderColor: colors.primary,
            backgroundColor: colors.primaryLight,
          },
        ]}
      >
        <View style={styles.cardContent}>
          {/* Select Mode Checkbox */}
          {isSelectMode ? (
            <TouchableOpacity
              onPress={onToggleSelect}
              style={styles.checkboxContainer}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isSelected ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          ) : null}

          <View style={{ flex: 1 }}>
            {/* Top Row: Word name, badges, and action buttons */}
            <View style={styles.topRow}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={[styles.wordText, { color: colors.text, fontSize: 16.5 * fontScale }]}>
                  {vocabulary.content}
                </Text>
                <Badge
                  label={vocabulary.type === 'phrase' ? '短语' : '单词'}
                  variant="neutral"
                  size="small"
                  style={{ marginLeft: 6 }}
                />
                {vocabulary.tags?.map((tag, idx) => (
                  <Badge key={idx} label={`#${tag}`} variant="primary" size="small" style={{ marginLeft: 4 }} />
                ))}
              </View>

              {!isSelectMode ? (
                <View style={styles.actionsGroup}>
                  {onEdit ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      style={styles.actionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="create-outline" size={17} color={colors.primary} />
                    </TouchableOpacity>
                  ) : null}

                  {showDelete && onDelete ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      style={[styles.actionBtn, { marginLeft: 4 }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* Meaning Row */}
            {primaryMeaning ? (
              <View style={styles.meaningRow}>
                {primaryMeaning.phonetic ? (
                  <Text style={[styles.phonetic, { color: colors.textSecondary, fontSize: 12.5 * fontScale }]}>
                    {formatPhonetic(primaryMeaning.phonetic)}
                  </Text>
                ) : null}
                {primaryMeaning.part_of_speech ? (
                  <Text style={[styles.pos, { color: colors.primary, fontSize: 12.5 * fontScale }]}>
                    {primaryMeaning.part_of_speech}
                  </Text>
                ) : null}
                <Text
                  numberOfLines={1}
                  style={[styles.definition, { color: colors.text, fontSize: 13.5 * fontScale }]}
                >
                  {primaryMeaning.zh_definition || primaryMeaning.en_definition}
                </Text>
              </View>
            ) : null}

            {/* Footer with counts */}
            <View style={styles.footerRow}>
              <Text style={[styles.meaningsCount, { color: colors.textTertiary, fontSize: 11 * fontScale }]}>
                共 {vocabulary.meanings.length} 条释义
              </Text>

              {totalAnnotations > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                  <Ionicons name="chatbox-ellipses-outline" size={12} color={colors.primary} />
                  <Text style={[styles.annoCount, { color: colors.primary, fontSize: 11 * fontScale }]}>
                    {totalAnnotations} 条批注
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    padding: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: 10,
    marginTop: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordText: {
    fontWeight: '700',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 4,
  },
  meaningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  phonetic: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginRight: 6,
  },
  pos: {
    fontWeight: '700',
    marginRight: 6,
  },
  definition: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  meaningsCount: {
    fontWeight: '500',
  },
  annoCount: {
    marginLeft: 4,
    fontWeight: '600',
  },
});
