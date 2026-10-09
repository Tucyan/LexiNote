import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vocabulary, Notebook, QueryHistory, AppSettings, LLMProviderConfig } from '@/types';
import {
  DEFAULT_SETTINGS,
  INITIAL_NOTEBOOKS,
  PRESET_PROVIDERS,
  GLOBAL_ROOT_NOTEBOOK_ID,
  DEFAULT_NOTEBOOK_ID,
} from '@/constants/defaults';

const KEYS = {
  VOCABULARIES: '@lexinote_vocabularies_v1',
  NOTEBOOKS: '@lexinote_notebooks_v1',
  RECENT_QUERIES: '@lexinote_recent_queries_v1',
  SETTINGS: '@lexinote_settings_v1',
  PROVIDERS: '@lexinote_providers_v1',
};

export class DatabaseService {
  /**
   * Load or initialize notebooks
   */
  static async getNotebooks(): Promise<Notebook[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.NOTEBOOKS);
      if (!raw) {
        await AsyncStorage.setItem(KEYS.NOTEBOOKS, JSON.stringify(INITIAL_NOTEBOOKS));
        return INITIAL_NOTEBOOKS;
      }
      const notebooks: Notebook[] = JSON.parse(raw);
      // Ensure global root and default notebook exist
      const hasGlobal = notebooks.some((n) => n.id === GLOBAL_ROOT_NOTEBOOK_ID);
      const hasDefault = notebooks.some((n) => n.id === DEFAULT_NOTEBOOK_ID);
      let updated = false;
      if (!hasGlobal) {
        notebooks.unshift(INITIAL_NOTEBOOKS[0]);
        updated = true;
      }
      if (!hasDefault) {
        notebooks.push(INITIAL_NOTEBOOKS[1]);
        updated = true;
      }
      if (updated) {
        await AsyncStorage.setItem(KEYS.NOTEBOOKS, JSON.stringify(notebooks));
      }
      return notebooks;
    } catch (e) {
      console.error('Failed to get notebooks:', e);
      return INITIAL_NOTEBOOKS;
    }
  }

  static async saveNotebooks(notebooks: Notebook[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.NOTEBOOKS, JSON.stringify(notebooks));
  }

  /**
   * Load or save vocabularies
   */
  static async getVocabularies(): Promise<Record<string, Vocabulary>> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.VOCABULARIES);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to get vocabularies:', e);
      return {};
    }
  }

  static async saveVocabularies(vocabularies: Record<string, Vocabulary>): Promise<void> {
    await AsyncStorage.setItem(KEYS.VOCABULARIES, JSON.stringify(vocabularies));
  }

  /**
   * Load or save recent queries (max 10, FIFO)
   */
  static async getRecentQueries(): Promise<QueryHistory[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.RECENT_QUERIES);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to get recent queries:', e);
      return [];
    }
  }

  static async saveRecentQueries(queries: QueryHistory[]): Promise<void> {
    // Keep at most 10 items
    const trimmed = queries.slice(0, 10);
    await AsyncStorage.setItem(KEYS.RECENT_QUERIES, JSON.stringify(trimmed));
  }

  static async addRecentQuery(query: QueryHistory): Promise<QueryHistory[]> {
    const list = await this.getRecentQueries();
    // Prepend new query and keep latest 10
    const filtered = list.filter((item) => item.id !== query.id);
    const updated = [query, ...filtered].slice(0, 10);
    await this.saveRecentQueries(updated);
    return updated;
  }

  static async deleteRecentQuery(id: string): Promise<QueryHistory[]> {
    const list = await this.getRecentQueries();
    const updated = list.filter((item) => item.id !== id);
    await this.saveRecentQueries(updated);
    return updated;
  }

  static async clearRecentQueries(): Promise<void> {
    await AsyncStorage.setItem(KEYS.RECENT_QUERIES, JSON.stringify([]));
  }

  /**
   * Load or save app settings
   */
  static async getSettings(): Promise<AppSettings> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
      if (!raw) {
        await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
      }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {
      console.error('Failed to get settings:', e);
      return DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  /**
   * Load or save LLM Providers
   */
  static async getProviders(): Promise<LLMProviderConfig[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.PROVIDERS);
      if (!raw) {
        await AsyncStorage.setItem(KEYS.PROVIDERS, JSON.stringify(PRESET_PROVIDERS));
        return PRESET_PROVIDERS;
      }
      const providers: LLMProviderConfig[] = JSON.parse(raw);
      const updated = providers.map((p) => {
        if (p.id === 'deepseek') {
          return {
            ...p,
            name: 'DeepSeek (Flash 多模态)',
            model_id: p.is_custom_model_id ? p.model_id : 'deepseek-flash',
            supports_vision: true,
          };
        }
        return p;
      });
      await AsyncStorage.setItem(KEYS.PROVIDERS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Failed to get providers:', e);
      return PRESET_PROVIDERS;
    }
  }

  static async saveProviders(providers: LLMProviderConfig[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.PROVIDERS, JSON.stringify(providers));
  }
}
