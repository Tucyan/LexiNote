import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '../common/Card';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../common/Button';

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

interface GuessClueCardProps {
  clues: ClueStage[];
  currentStage: number;
  totalStages: number;
  loadingNext: boolean;
  onNextStage: () => void;
  onTransferToQuery: (word: string, context?: string) => void;
}

export function GuessClueCard({
  clues,
  currentStage,
  totalStages,
  loadingNext,
  onNextStage,
  onTransferToQuery,
}: GuessClueCardProps) {
  const { colors, fontScale } = useTheme();

  const latestClue = clues[clues.length - 1];

  const getStageIcon = (stage: number) => {
    switch (stage) {
      case 1:
        return 'eye-outline';
      case 2:
        return 'git-branch-outline';
      case 3:
        return 'construct-outline';
      case 4:
        return 'bulb-outline';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress Dots */}
      <View style={styles.progressRow}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  s <= clues.length ? colors.primary : colors.inputBg,
                borderColor: s <= clues.length ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.dotNumber,
                {
                  color: s <= clues.length ? '#FFFFFF' : colors.textMuted,
                  fontSize: 10 * fontScale,
                },
              ]}
            >
              {s}
            </Text>
          </View>
        ))}
      </View>

      {/* Accordion / List of unlocked clues */}
      {clues.map((clue, idx) => (
        <Card
          key={idx}
          variant="elevated"
          style={[
            styles.clueCard,
            clue.is_final && { borderColor: colors.primary, borderWidth: 1.5 },
          ]}
        >
          <View style={styles.clueHeader}>
            <View style={[styles.clueBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons
                name={getStageIcon(clue.stage) as any}
                size={16}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.stageTitle, { color: colors.text, fontSize: 14 * fontScale }]}>
                阶段 {clue.stage}：{clue.stage_title}
              </Text>
            </View>
          </View>

          <Text style={[styles.hintContent, { color: colors.text, fontSize: 13.5 * fontScale }]}>
            {clue.hint_content}
          </Text>

          {/* If final stage: show full answer summary */}
          {clue.is_final && clue.final_data ? (
            <View style={[styles.finalBox, { backgroundColor: colors.inputBg, borderColor: colors.primary }]}>
              <Text style={[styles.finalWord, { color: colors.primary, fontSize: 18 * fontScale }]}>
                {clue.final_data.word} {clue.final_data.phonetic ? `[${clue.final_data.phonetic}]` : ''}
              </Text>
              <Text style={[styles.finalDef, { color: colors.text, fontSize: 14 * fontScale }]}>
                {clue.final_data.zh_definition}
              </Text>
              <Text style={[styles.finalEn, { color: colors.textSecondary, fontSize: 12.5 * fontScale }]}>
                {clue.final_data.en_definition}
              </Text>
            </View>
          ) : null}
        </Card>
      ))}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {!latestClue?.is_final && (
          <Button
            title={clues.length < 3 ? '获取下一步提示' : '揭晓最终答案'}
            variant="primary"
            loading={loadingNext}
            onPress={onNextStage}
            icon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
            style={{ flex: 1, marginRight: 8 }}
          />
        )}

        <Button
          title="转入「查询和记录」"
          variant={latestClue?.is_final ? 'primary' : 'outline'}
          onPress={() => {
            const targetWord =
              latestClue?.final_data?.word || latestClue?.hint_content || '';
            onTransferToQuery(targetWord);
          }}
          icon={<Ionicons name="arrow-redo-outline" size={16} color={latestClue?.is_final ? '#FFFFFF' : colors.text} />}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dotNumber: {
    fontWeight: '700',
  },
  clueCard: {
    marginBottom: 12,
    padding: 14,
  },
  clueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clueBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTitle: {
    fontWeight: '700',
  },
  hintContent: {
    lineHeight: 21,
  },
  finalBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  finalWord: {
    fontWeight: '800',
  },
  finalDef: {
    fontWeight: '600',
    marginTop: 4,
  },
  finalEn: {
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
