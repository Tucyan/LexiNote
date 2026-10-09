import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface MarkdownViewProps {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownView({ content, isStreaming = false }: MarkdownViewProps) {
  const { colors, fontScale } = useTheme();

  if (!content) {
    return isStreaming ? (
      <Text style={[styles.cursor, { color: colors.primary, fontSize: 15 * fontScale }]}>▋</Text>
    ) : null;
  }

  // Parse lines into structured blocks
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';

  const renderInlineFormatted = (text: string, keyPrefix: string): React.ReactNode[] => {
    // Regular expression to match bold, italic, inline code, and streaming cursor
    // Pattern: `code`, **bold**, *italic*, ▋
    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|▋)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`${keyPrefix}-t-${lastIndex}`} style={{ color: colors.text, fontSize: 14 * fontScale, lineHeight: 22 * fontScale }}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }

      const raw = match[0];
      if (raw === '▋') {
        parts.push(
          <Text key={`${keyPrefix}-cur`} style={[styles.cursor, { color: colors.primary, fontSize: 14 * fontScale }]}>
            ▋
          </Text>
        );
      } else if (raw.startsWith('`') && raw.endsWith('`')) {
        parts.push(
          <Text
            key={`${keyPrefix}-c-${match.index}`}
            style={[
              styles.inlineCode,
              {
                backgroundColor: colors.inputBg,
                color: colors.primary,
                borderColor: colors.border,
                fontSize: 13 * fontScale,
              },
            ]}
          >
            {` ${raw.slice(1, -1)} `}
          </Text>
        );
      } else if (raw.startsWith('**') && raw.endsWith('**')) {
        parts.push(
          <Text
            key={`${keyPrefix}-b-${match.index}`}
            style={{ fontWeight: '700', color: colors.text, fontSize: 14 * fontScale, lineHeight: 22 * fontScale }}
          >
            {raw.slice(2, -2)}
          </Text>
        );
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        parts.push(
          <Text
            key={`${keyPrefix}-i-${match.index}`}
            style={{ fontStyle: 'italic', color: colors.textSecondary, fontSize: 14 * fontScale, lineHeight: 22 * fontScale }}
          >
            {raw.slice(1, -1)}
          </Text>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(
        <Text key={`${keyPrefix}-end`} style={{ color: colors.text, fontSize: 14 * fontScale, lineHeight: 22 * fontScale }}>
          {text.substring(lastIndex)}
        </Text>
      );
    }

    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block start / end
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        blocks.push(
          <View
            key={`codeblock-${i}`}
            style={[styles.codeBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          >
            {codeLang ? (
              <View style={[styles.codeHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.codeLangText, { color: colors.textTertiary, fontSize: 11 * fontScale }]}>
                  {codeLang.toUpperCase()}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.codeText, { color: colors.text, fontSize: 12.5 * fontScale }]}>
              {codeBuffer.join('\n')}
            </Text>
          </View>
        );
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
      } else {
        // Start code block
        inCodeBlock = true;
        codeLang = line.trim().replace(/^```/, '').trim();
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      blocks.push(<View key={`empty-${i}`} style={{ height: 6 }} />);
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push(
        <View key={`hr-${i}`} style={[styles.hr, { backgroundColor: colors.border }]} />
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      blocks.push(
        <Text
          key={`h1-${i}`}
          style={[styles.h1, { color: colors.text, fontSize: 18 * fontScale, lineHeight: 26 * fontScale }]}
        >
          {trimmed.substring(2)}
        </Text>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push(
        <Text
          key={`h2-${i}`}
          style={[styles.h2, { color: colors.text, fontSize: 16 * fontScale, lineHeight: 24 * fontScale }]}
        >
          {trimmed.substring(3)}
        </Text>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push(
        <Text
          key={`h3-${i}`}
          style={[styles.h3, { color: colors.primary, fontSize: 14.5 * fontScale, lineHeight: 22 * fontScale }]}
        >
          {trimmed.substring(4)}
        </Text>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      blocks.push(
        <View
          key={`quote-${i}`}
          style={[
            styles.quoteContainer,
            { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary },
          ]}
        >
          <Text style={[styles.quoteText, { color: colors.text, fontSize: 13.5 * fontScale }]}>
            {renderInlineFormatted(trimmed.substring(2), `q-${i}`)}
          </Text>
        </View>
      );
      continue;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const listText = trimmed.replace(/^[-*•]\s+/, '');
      blocks.push(
        <View key={`bullet-${i}`} style={styles.listRow}>
          <Text style={[styles.bulletDot, { color: colors.primary, fontSize: 14 * fontScale }]}>•</Text>
          <Text style={{ flex: 1 }}>{renderInlineFormatted(listText, `b-${i}`)}</Text>
        </View>
      );
      continue;
    }

    // Numbered list (e.g. 1. , 2. )
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      blocks.push(
        <View key={`num-${i}`} style={styles.listRow}>
          <Text style={[styles.numIndex, { color: colors.primary, fontSize: 13.5 * fontScale }]}>
            {numberedMatch[1]}.
          </Text>
          <Text style={{ flex: 1 }}>{renderInlineFormatted(numberedMatch[2], `n-${i}`)}</Text>
        </View>
      );
      continue;
    }

    // Standard Paragraph
    blocks.push(
      <Text key={`p-${i}`} style={[styles.paragraph, { lineHeight: 22 * fontScale }]}>
        {renderInlineFormatted(line, `p-${i}`)}
      </Text>
    );
  }

  // If ended while still in code block
  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push(
      <View
        key="codeblock-unclosed"
        style={[styles.codeBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
      >
        <Text style={[styles.codeText, { color: colors.text, fontSize: 12.5 * fontScale }]}>
          {codeBuffer.join('\n')}
        </Text>
      </View>
    );
  }

  return <View style={styles.container}>{blocks}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  paragraph: {
    marginVertical: 2,
  },
  h1: {
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  h2: {
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  h3: {
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
  },
  quoteContainer: {
    borderLeftWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 4,
  },
  quoteText: {
    fontStyle: 'italic',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  bulletDot: {
    width: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  numIndex: {
    minWidth: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  codeBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  codeHeader: {
    borderBottomWidth: 1,
    paddingBottom: 4,
    marginBottom: 6,
  },
  codeLangText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  codeText: {
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  inlineCode: {
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  hr: {
    height: 1,
    marginVertical: 8,
  },
  cursor: {
    fontWeight: '900',
  },
});
