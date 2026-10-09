import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { QueryHistory } from '@/types';
import { DatabaseService } from '@/services/storage/db';

interface HistoryContextType {
  recentQueries: QueryHistory[];
  isReady: boolean;
  activeHistoryItem: QueryHistory | null;
  addQueryHistory: (query: QueryHistory) => Promise<void>;
  updateQueryHistory: (id: string, updates: Partial<QueryHistory>) => Promise<void>;
  deleteQueryHistory: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  setActiveHistoryItem: (item: QueryHistory | null) => void;
  reloadHistory: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [recentQueries, setRecentQueries] = useState<QueryHistory[]>([]);
  const [activeHistoryItem, setActiveHistoryItem] = useState<QueryHistory | null>(null);
  const [isReady, setIsReady] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const list = await DatabaseService.getRecentQueries();
      setRecentQueries(list);
    } catch (e) {
      console.error('Failed to load recent queries:', e);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addQueryHistory = async (query: QueryHistory) => {
    try {
      const updated = await DatabaseService.addRecentQuery(query);
      setRecentQueries(updated);
    } catch (e) {
      console.error('Failed to add query history:', e);
    }
  };

  const updateQueryHistory = async (id: string, updates: Partial<QueryHistory>) => {
    try {
      const updated = recentQueries.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      setRecentQueries(updated);
      await DatabaseService.saveRecentQueries(updated);
    } catch (e) {
      console.error('Failed to update query history:', e);
    }
  };

  const deleteQueryHistory = async (id: string) => {
    try {
      const updated = await DatabaseService.deleteRecentQuery(id);
      setRecentQueries(updated);
      if (activeHistoryItem?.id === id) {
        setActiveHistoryItem(null);
      }
    } catch (e) {
      console.error('Failed to delete query history:', e);
    }
  };

  const clearAllHistory = async () => {
    try {
      await DatabaseService.clearRecentQueries();
      setRecentQueries([]);
      setActiveHistoryItem(null);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  };

  return (
    <HistoryContext.Provider
      value={{
        recentQueries,
        isReady,
        activeHistoryItem,
        addQueryHistory,
        updateQueryHistory,
        deleteQueryHistory,
        clearAllHistory,
        setActiveHistoryItem,
        reloadHistory: loadHistory,
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    throw new Error('useHistory must be used within HistoryProvider');
  }
  return ctx;
}
