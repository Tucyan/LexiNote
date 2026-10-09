import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewScreen() {
  const { colors, fontScale } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Card variant="flat" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="repeat" size={44} color={colors.primary} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
          <Text style={[styles.title, { color: colors.text, fontSize: 18 * fontScale }]}>
            复习中心
          </Text>
          <Badge label="预留模块 (v1.2)" variant="primary" style={{ marginLeft: 8 }} />
        </View>

        <Text style={[styles.description, { color: colors.textSecondary, fontSize: 13.5 * fontScale }]}>
          根据产品需求规范，本页面为规划中的预留模块。
        </Text>

        <View style={[styles.featureList, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.featureHeader, { color: colors.text, fontSize: 13 * fontScale }]}>
            未来版本规划特性：
          </Text>
          {[
            '艾宾浩斯间隔重复遗忘曲线记忆算法',
            '双向互动闪卡（词义翻转 / 填空抽认卡）',
            '错词与易混词专属攻坚集',
            'AI 生成定制化语境复习测试题',
          ].map((item, idx) => (
            <View key={idx} style={styles.featureItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary, fontSize: 12.5 * fontScale }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
  },
  description: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  featureList: {
    width: '100%',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  featureHeader: {
    fontWeight: '700',
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  featureText: {
    marginLeft: 8,
  },
});
