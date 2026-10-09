import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppSettings, LLMProviderConfig } from '@/types';
import { DEFAULT_SETTINGS, PRESET_PROVIDERS } from '@/constants/defaults';
import { DatabaseService } from '@/services/storage/db';
import { getApiKey, saveApiKey, deleteApiKey } from '@/services/storage/secureStore';
import { LLMClient } from '@/services/llm/client';

interface SettingsContextType {
  settings: AppSettings;
  providers: LLMProviderConfig[];
  activeProvider: LLMProviderConfig;
  activeApiKey: string;
  isReady: boolean;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  updateProvider: (id: string, updates: Partial<LLMProviderConfig>) => Promise<void>;
  addProvider: (provider: LLMProviderConfig) => Promise<void>;
  setActiveApiKey: (key: string) => Promise<void>;
  testActiveConnection: () => Promise<{ success: boolean; message: string }>;
  reloadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [providers, setProviders] = useState<LLMProviderConfig[]>(PRESET_PROVIDERS);
  const [activeApiKey, setActiveApiKeyState] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const savedSettings = await DatabaseService.getSettings();
      const savedProviders = await DatabaseService.getProviders();
      setSettings(savedSettings);
      setProviders(savedProviders);

      const key = await getApiKey(savedSettings.active_provider_id);
      setActiveApiKeyState(key || '');
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeProvider =
    providers.find((p) => p.id === settings.active_provider_id) || providers[0] || PRESET_PROVIDERS[0];

  const updateSettings = async (partial: Partial<AppSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await DatabaseService.saveSettings(updated);

    if (partial.active_provider_id && partial.active_provider_id !== settings.active_provider_id) {
      const newKey = await getApiKey(partial.active_provider_id);
      setActiveApiKeyState(newKey || '');
    }
  };

  const updateProvider = async (id: string, updates: Partial<LLMProviderConfig>) => {
    const updatedList = providers.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setProviders(updatedList);
    await DatabaseService.saveProviders(updatedList);
  };

  const addProvider = async (provider: LLMProviderConfig) => {
    const updatedList = [...providers, provider];
    setProviders(updatedList);
    await DatabaseService.saveProviders(updatedList);
  };

  const setActiveApiKey = async (key: string) => {
    setActiveApiKeyState(key);
    if (!key.trim()) {
      await deleteApiKey(settings.active_provider_id);
    } else {
      await saveApiKey(settings.active_provider_id, key.trim());
    }
  };

  const testActiveConnection = async () => {
    return await LLMClient.testConnection(activeProvider, activeApiKey);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        providers,
        activeProvider,
        activeApiKey,
        isReady,
        updateSettings,
        updateProvider,
        addProvider,
        setActiveApiKey,
        testActiveConnection,
        reloadSettings: loadData,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
