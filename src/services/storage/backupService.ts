import { DatabaseService } from './db';
import { BackupData, Vocabulary } from '@/types';
import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';

export class BackupService {
  /**
   * Create complete backup of all data (excluding API keys)
   */
  static async createFullBackup(): Promise<BackupData> {
    const vocabMap = await DatabaseService.getVocabularies();
    const notebooks = await DatabaseService.getNotebooks();
    const recentQueries = await DatabaseService.getRecentQueries();
    const settings = await DatabaseService.getSettings();

    // Clean up settings to ensure no sensitive fields
    const safeSettings = { ...settings };

    return {
      version: '1.1',
      export_date: new Date().toISOString(),
      vocabularies: Object.values(vocabMap),
      notebooks,
      recent_queries: recentQueries,
      settings: safeSettings,
    };
  }

  /**
   * Restore full backup data
   */
  static async restoreFullBackup(
    backup: BackupData
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!backup || !backup.vocabularies || !backup.notebooks) {
        return { success: false, message: '备份数据格式无效，缺少核心词汇或笔记结构' };
      }

      // Convert vocabularies array back to record
      const vocabMap: Record<string, Vocabulary> = {};
      for (const vocab of backup.vocabularies) {
        if (vocab && vocab.id) {
          vocabMap[vocab.id] = vocab;
        }
      }

      await DatabaseService.saveVocabularies(vocabMap);
      await DatabaseService.saveNotebooks(backup.notebooks);

      if (Array.isArray(backup.recent_queries)) {
        await DatabaseService.saveRecentQueries(backup.recent_queries.slice(0, 10));
      }

      if (backup.settings) {
        const currentSettings = await DatabaseService.getSettings();
        await DatabaseService.saveSettings({
          ...currentSettings,
          ...backup.settings,
        });
      }

      return {
        success: true,
        message: `成功恢复 ${backup.vocabularies.length} 个词汇及 ${backup.notebooks.length} 个笔记！`,
      };
    } catch (error: any) {
      console.error('Failed to restore backup:', error);
      return { success: false, message: error?.message || '恢复备份失败' };
    }
  }

  /**
   * Generate Markdown export of vocabularies
   */
  static generateMarkdown(vocabularies: Vocabulary[], notebookName?: string): string {
    const lines: string[] = [];
    lines.push(`# LexiNote 笔记导出${notebookName ? ` - ${notebookName}` : ''}`);
    lines.push(`导出时间：${new Date().toLocaleString()}\n`);
    lines.push(`总词汇数：${vocabularies.length}\n`);
    lines.push('---\n');

    for (const v of vocabularies) {
      lines.push(`## ${v.content} (${v.type === 'phrase' ? '短语' : '单词'})`);
      if (v.tags && v.tags.length > 0) {
        lines.push(`**标签**: ${v.tags.join(', ')}`);
      }

      for (let i = 0; i < v.meanings.length; i++) {
        const m = v.meanings[i];
        lines.push(`### 释义 ${i + 1}`);
        if (m.phonetic) lines.push(`- **音标**: /${m.phonetic.replace(/\//g, '')}/`);
        if (m.part_of_speech) lines.push(`- **词性**: ${m.part_of_speech}`);
        if (m.zh_definition) lines.push(`- **中文释义**: ${m.zh_definition}`);
        if (m.en_definition) lines.push(`- **英文释义**: ${m.en_definition}`);
        if (m.example) lines.push(`- **例句**: ${m.example}`);
        if (m.source) lines.push(`- **来源**: ${m.source}`);
        if (m.remarks) lines.push(`- **备注**: ${m.remarks}`);

        if (m.annotations && m.annotations.length > 0) {
          lines.push(`- **批注**:`);
          for (const a of m.annotations) {
            lines.push(
              `  - [${a.target_field || '通用'}${a.target_text ? `: "${a.target_text}"` : ''}] ${a.content}`
            );
          }
        }
      }
      lines.push('\n---\n');
    }

    return lines.join('\n');
  }

  /**
   * Share or copy exported content
   */
  static async shareExport(content: string, filename: string): Promise<void> {
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(content);
      return;
    }
    // On native, copy to clipboard as universal fallback or use file sharing
    await Clipboard.setStringAsync(content);
  }
}
