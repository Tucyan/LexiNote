import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Vocabulary } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Ionicons } from '@expo/vector-icons';

interface VocabularyItemProps {
  vocabulary: Vocabulary;
  onPress: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

export function VocabularyItem({
  vocabulary,
  onPress,
  onDelete,
  showDelete = true,
}: VocabularyItemProps) {
  const { colors, fontScale } = useTheme();

  const primaryMeaning = vocabulary.meanings[0];
  const totalAnnotations = vocabulary.meanings.reduce(
    (acc, m) => acc + (m.annotations ? m.annotations.length : 0),
    0
  );

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Card variant="outlined" style={styles.card}>
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

          {showDelete && onDelete ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {primaryMeaning ? (
          <View style={styles.meaningRow}>
            {primaryMeaning.phonetic ? (
              <Text style={[styles.phonetic, { color: colors.textSecondary, fontSize: 12.5 * fontScale }]}>
                {primaryMeaning.phonetic}
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

        {/* Footer with badges */}
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
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    padding: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordText: {
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
  },
  meaningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  phonetic: {
    fontFamily: 'monospace',
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
