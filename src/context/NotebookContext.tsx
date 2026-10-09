import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Notebook,
  Vocabulary,
  Meaning,
  Annotation,
  ChildrenType,
} from '@/types';
import { DatabaseService } from '@/services/storage/db';
import { generateId } from '@/utils/id';
import {
  GLOBAL_ROOT_NOTEBOOK_ID,
  DEFAULT_NOTEBOOK_ID,
} from '@/constants/defaults';

interface SaveVocabularyOptions {
  targetNotebookIds?: string[];
  mergeExisting?: boolean;
}

interface NotebookContextType {
  notebooks: Notebook[];
  vocabularies: Record<string, Vocabulary>;
  isReady: boolean;
  findVocabularyByContent: (text: string) => Vocabulary | undefined;
  getVocabularyById: (id: string) => Vocabulary | undefined;
  getNotebookById: (id: string) => Notebook | undefined;
  createNotebook: (
    name: string,
    parentId?: string | null,
    childrenType?: ChildrenType,
    tags?: string[]
  ) => Promise<Notebook>;
  updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  saveVocabulary: (
    vocabData: Partial<Vocabulary> & { content: string },
    options?: SaveVocabularyOptions
  ) => Promise<Vocabulary>;
  updateVocabulary: (id: string, updates: Partial<Vocabulary>) => Promise<void>;
  deleteVocabulary: (vocabId: string, fromNotebookId?: string) => Promise<void>;
  batchDeleteVocabularies: (vocabIds: string[], fromNotebookId?: string) => Promise<void>;
  batchAddVocabulariesToNotebook: (vocabIds: string[], targetNotebookId: string) => Promise<void>;
  addMeaningToVocabulary: (vocabId: string, meaning: Meaning) => Promise<void>;
  updateMeaning: (vocabId: string, meaning: Meaning) => Promise<void>;
  deleteMeaning: (vocabId: string, meaningId: string) => Promise<void>;
  addAnnotation: (
    vocabId: string,
    meaningId: string,
    annotation: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<void>;
  deleteAnnotation: (vocabId: string, meaningId: string, annotationId: string) => Promise<void>;
  reloadAll: () => Promise<void>;
}

const NotebookContext = createContext<NotebookContextType | null>(null);

export function NotebookProvider({ children }: { children: React.ReactNode }) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [vocabularies, setVocabularies] = useState<Record<string, Vocabulary>>({});
  const [isReady, setIsReady] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [nbs, vocabs] = await Promise.all([
        DatabaseService.getNotebooks(),
        DatabaseService.getVocabularies(),
      ]);

      // Ensure global root has all vocabulary IDs
      const allVocabIds = Object.keys(vocabs);
      const updatedNbs = nbs.map((nb) => {
        if (nb.id === GLOBAL_ROOT_NOTEBOOK_ID) {
          return {
            ...nb,
            vocabulary_ids: allVocabIds,
          };
        }
        return nb;
      });

      setNotebooks(updatedNbs);
      setVocabularies(vocabs);
    } catch (e) {
      console.error('Failed to load notebooks and vocabularies:', e);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /**
   * Find vocabulary by content (case-insensitive exact match)
   */
  const findVocabularyByContent = useCallback(
    (text: string): Vocabulary | undefined => {
      const clean = text.trim().toLowerCase();
      if (!clean) return undefined;
      return Object.values(vocabularies).find(
        (v) => v.content.trim().toLowerCase() === clean
      );
    },
    [vocabularies]
  );

  const getVocabularyById = useCallback(
    (id: string): Vocabulary | undefined => {
      return vocabularies[id];
    },
    [vocabularies]
  );

  const getNotebookById = useCallback(
    (id: string): Notebook | undefined => {
      return notebooks.find((n) => n.id === id);
    },
    [notebooks]
  );

  /**
   * Create a new notebook
   * Rule: Direct children under the same parent must be uniform in type
   */
  const createNotebook = async (
    name: string,
    parentId: string | null = null,
    childrenType: ChildrenType = 'vocabulary',
    tags?: string[]
  ): Promise<Notebook> => {
    const newId = generateId('nb');
    const now = new Date().toISOString();
    const newNotebook: Notebook = {
      id: newId,
      name: name.trim(),
      created_at: now,
      updated_at: now,
      parent_id: parentId,
      children_type: childrenType,
      child_notebook_ids: [],
      vocabulary_ids: [],
      tags: tags || [],
    };

    let updatedList = [...notebooks, newNotebook];

    // If it has a parent, attach to parent's child_notebook_ids
    if (parentId) {
      updatedList = updatedList.map((nb) => {
        if (nb.id === parentId) {
          return {
            ...nb,
            children_type: 'notebook', // Enforce parent's children type to notebook
            child_notebook_ids: [...nb.child_notebook_ids, newId],
            updated_at: now,
          };
        }
        return nb;
      });
    }

    setNotebooks(updatedList);
    await DatabaseService.saveNotebooks(updatedList);
    return newNotebook;
  };

  const updateNotebook = async (id: string, updates: Partial<Notebook>) => {
    const now = new Date().toISOString();
    const updatedList = notebooks.map((nb) =>
      nb.id === id ? { ...nb, ...updates, updated_at: now } : nb
    );
    setNotebooks(updatedList);
    await DatabaseService.saveNotebooks(updatedList);
  };

  const deleteNotebook = async (id: string) => {
    // Cannot delete global root or default notebook
    if (id === GLOBAL_ROOT_NOTEBOOK_ID || id === DEFAULT_NOTEBOOK_ID) {
      return;
    }

    const updatedList = notebooks
      .filter((n) => n.id !== id)
      .map((nb) => {
        if (nb.child_notebook_ids.includes(id)) {
          return {
            ...nb,
            child_notebook_ids: nb.child_notebook_ids.filter((cid) => cid !== id),
          };
        }
        return nb;
      });

    setNotebooks(updatedList);
    await DatabaseService.saveNotebooks(updatedList);
  };

  /**
   * Save or update vocabulary with target notebook association
   */
  const saveVocabulary = async (
    vocabData: Partial<Vocabulary> & { content: string },
    options: SaveVocabularyOptions = {}
  ): Promise<Vocabulary> => {
    const now = new Date().toISOString();
    const cleanContent = vocabData.content.trim();
    const existing = findVocabularyByContent(cleanContent);
    const targetNotebookIds =
      options.targetNotebookIds && options.targetNotebookIds.length > 0
        ? options.targetNotebookIds
        : [DEFAULT_NOTEBOOK_ID];

    let finalVocab: Vocabulary;

    if (existing && options.mergeExisting !== false) {
      // Merge / supplement existing vocabulary entity
      const newMeanings = [...existing.meanings];
      if (vocabData.meanings) {
        for (const incomingM of vocabData.meanings) {
          const matchedIndex = newMeanings.findIndex(
            (m) =>
              (m.zh_definition && m.zh_definition === incomingM.zh_definition) ||
              (m.en_definition && m.en_definition === incomingM.en_definition)
          );
          if (matchedIndex >= 0) {
            // Supplement fields
            newMeanings[matchedIndex] = {
              ...newMeanings[matchedIndex],
              example: incomingM.example || newMeanings[matchedIndex].example,
              source: incomingM.source || newMeanings[matchedIndex].source,
              remarks: incomingM.remarks || newMeanings[matchedIndex].remarks,
              phonetic: incomingM.phonetic || newMeanings[matchedIndex].phonetic,
              updated_at: now,
            };
          } else {
            // Append new meaning
            newMeanings.push({
              ...incomingM,
              id: incomingM.id || generateId('m'),
              created_at: now,
              updated_at: now,
            });
          }
        }
      }

      finalVocab = {
        ...existing,
        tags: Array.from(new Set([...(existing.tags || []), ...(vocabData.tags || [])])),
        meanings: newMeanings,
        updated_at: now,
      };
    } else {
      // Create new vocabulary entity
      const vocabId = existing ? existing.id : generateId('v');
      finalVocab = {
        id: vocabId,
        type: vocabData.type || (cleanContent.includes(' ') ? 'phrase' : 'word'),
        content: cleanContent,
        created_at: now,
        updated_at: now,
        tags: vocabData.tags || [],
        meanings: (vocabData.meanings || []).map((m) => ({
          ...m,
          id: m.id || generateId('m'),
          created_at: now,
          updated_at: now,
        })),
      };
    }

    // Save vocabularies map
    const updatedVocabs = {
      ...vocabularies,
      [finalVocab.id]: finalVocab,
    };
    setVocabularies(updatedVocabs);
    await DatabaseService.saveVocabularies(updatedVocabs);

    // Update notebook references
    const updatedNotebooks = notebooks.map((nb) => {
      // Global root always references every vocabulary
      if (nb.id === GLOBAL_ROOT_NOTEBOOK_ID) {
        if (!nb.vocabulary_ids.includes(finalVocab.id)) {
          return {
            ...nb,
            vocabulary_ids: [...nb.vocabulary_ids, finalVocab.id],
            updated_at: now,
          };
        }
        return nb;
      }

      // Check if this notebook is among target notebooks
      if (targetNotebookIds.includes(nb.id)) {
        if (!nb.vocabulary_ids.includes(finalVocab.id)) {
          return {
            ...nb,
            children_type: 'vocabulary' as ChildrenType,
            vocabulary_ids: [...nb.vocabulary_ids, finalVocab.id],
            updated_at: now,
          };
        }
      }

      return nb;
    });

    setNotebooks(updatedNotebooks);
    await DatabaseService.saveNotebooks(updatedNotebooks);

    return finalVocab;
  };

  /**
   * Delete vocabulary
   * If fromNotebookId is specified and is not global, remove reference only
   * If fromNotebookId is omitted or global, delete vocabulary entity completely
   */
  const deleteVocabulary = async (vocabId: string, fromNotebookId?: string) => {
    const isRemoveRefOnly = fromNotebookId && fromNotebookId !== GLOBAL_ROOT_NOTEBOOK_ID;

    if (isRemoveRefOnly) {
      const updatedNotebooks = notebooks.map((nb) => {
        if (nb.id === fromNotebookId) {
          return {
            ...nb,
            vocabulary_ids: nb.vocabulary_ids.filter((id) => id !== vocabId),
            updated_at: new Date().toISOString(),
          };
        }
        return nb;
      });
      setNotebooks(updatedNotebooks);
      await DatabaseService.saveNotebooks(updatedNotebooks);
      return;
    }

    // Completely delete vocabulary entity and all notebook references
    const { [vocabId]: removed, ...remainingVocabs } = vocabularies;
    setVocabularies(remainingVocabs);
    await DatabaseService.saveVocabularies(remainingVocabs);

    const updatedNotebooks = notebooks.map((nb) => ({
      ...nb,
      vocabulary_ids: nb.vocabulary_ids.filter((id) => id !== vocabId),
      updated_at: new Date().toISOString(),
    }));
    setNotebooks(updatedNotebooks);
    await DatabaseService.saveNotebooks(updatedNotebooks);
  };

  /**
   * Update vocabulary entity directly
   */
  const updateVocabulary = async (id: string, updates: Partial<Vocabulary>) => {
    const existing = vocabularies[id];
    if (!existing) return;
    const now = new Date().toISOString();
    const updatedVocab: Vocabulary = {
      ...existing,
      ...updates,
      updated_at: now,
    };
    const updatedMap = {
      ...vocabularies,
      [id]: updatedVocab,
    };
    setVocabularies(updatedMap);
    await DatabaseService.saveVocabularies(updatedMap);
  };

  /**
   * Batch delete or remove vocabularies
   */
  const batchDeleteVocabularies = async (vocabIds: string[], fromNotebookId?: string) => {
    if (!vocabIds.length) return;
    const isRemoveRefOnly = fromNotebookId && fromNotebookId !== GLOBAL_ROOT_NOTEBOOK_ID;
    const now = new Date().toISOString();
    const idSet = new Set(vocabIds);

    if (isRemoveRefOnly) {
      const updatedNotebooks = notebooks.map((nb) => {
        if (nb.id === fromNotebookId) {
          return {
            ...nb,
            vocabulary_ids: nb.vocabulary_ids.filter((id) => !idSet.has(id)),
            updated_at: now,
          };
        }
        return nb;
      });
      setNotebooks(updatedNotebooks);
      await DatabaseService.saveNotebooks(updatedNotebooks);
      return;
    }

    // Completely delete from dictionary and all notebooks
    const remainingVocabs = { ...vocabularies };
    vocabIds.forEach((id) => {
      delete remainingVocabs[id];
    });
    setVocabularies(remainingVocabs);
    await DatabaseService.saveVocabularies(remainingVocabs);

    const updatedNotebooks = notebooks.map((nb) => ({
      ...nb,
      vocabulary_ids: nb.vocabulary_ids.filter((id) => !idSet.has(id)),
      updated_at: now,
    }));
    setNotebooks(updatedNotebooks);
    await DatabaseService.saveNotebooks(updatedNotebooks);
  };

  /**
   * Batch add vocabularies to a target notebook
   */
  const batchAddVocabulariesToNotebook = async (vocabIds: string[], targetNotebookId: string) => {
    if (!vocabIds.length || targetNotebookId === GLOBAL_ROOT_NOTEBOOK_ID) return;
    const now = new Date().toISOString();
    const updatedNotebooks = notebooks.map((nb) => {
      if (nb.id === targetNotebookId) {
        const merged = Array.from(new Set([...nb.vocabulary_ids, ...vocabIds]));
        return {
          ...nb,
          children_type: 'vocabulary' as ChildrenType,
          vocabulary_ids: merged,
          updated_at: now,
        };
      }
      return nb;
    });
    setNotebooks(updatedNotebooks);
    await DatabaseService.saveNotebooks(updatedNotebooks);
  };

  const addMeaningToVocabulary = async (vocabId: string, meaning: Meaning) => {
    const vocab = vocabularies[vocabId];
    if (!vocab) return;

    const now = new Date().toISOString();
    const newMeaning = {
      ...meaning,
      id: meaning.id || generateId('m'),
      created_at: now,
      updated_at: now,
    };
    const updatedVocab: Vocabulary = {
      ...vocab,
      meanings: [...vocab.meanings, newMeaning],
      updated_at: now,
    };

    const updatedMap = { ...vocabularies, [vocabId]: updatedVocab };
    setVocabularies(updatedMap);
    await DatabaseService.saveVocabularies(updatedMap);
  };

  const updateMeaning = async (vocabId: string, meaning: Meaning) => {
    const vocab = vocabularies[vocabId];
    if (!vocab) return;

    const now = new Date().toISOString();
    const updatedVocab: Vocabulary = {
      ...vocab,
      meanings: vocab.meanings.map((m) =>
        m.id === meaning.id ? { ...meaning, updated_at: now } : m
      ),
      updated_at: now,
    };

    const updatedMap = { ...vocabularies, [vocabId]: updatedVocab };
    setVocabularies(updatedMap);
    await DatabaseService.saveVocabularies(updatedMap);
  };

  const deleteMeaning = async (vocabId: string, meaningId: string) => {
    const vocab = vocabularies[vocabId];
    if (!vocab) return;

    const now = new Date().toISOString();
    const updatedVocab: Vocabulary = {
      ...vocab,
      meanings: vocab.meanings.filter((m) => m.id !== meaningId),
      updated_at: now,
    };

    const updatedMap = { ...vocabularies, [vocabId]: updatedVocab };
    setVocabularies(updatedMap);
    await DatabaseService.saveVocabularies(updatedMap);
  };

  const addAnnotation = async (
    vocabId: string,
    meaningId: string,
    annotation: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const vocab = vocabularies[vocabId];
    if (!vocab) return;

    const now = new Date().toISOString();
    const newAnno: Annotation = {
      ...annotation,
      id: generateId('anno'),
      meaning_id: meaningId,
      created_at: now,
      updated_at: now,
    };

    const updatedVocab: Vocabulary = {
      ...vocab,
      meanings: vocab.meanings.map((m) => {
        if (m.id === meaningId) {
          return {
            ...m,
            annotations: [...(m.annotations || []), newAnno],
            updated_at: now,
          };
        }
        return m;
      }),
      updated_at: now,
    };

    const updatedMap = { ...vocabularies, [vocabId]: updatedVocab };
    setVocabularies(updatedMap);
    await DatabaseService.saveVocabularies(updatedMap);
  };

  const deleteAnnotation = async (vocabId: string, meaningId: string, annotationId: string) => {
    const vocab = vocabularies[vocabId];
    if (!vocab) return;

    const now = new Date().toISOString();
    const updatedVocab: Vocabulary = {
      ...vocab,
      meanings: vocab.meanings.map((m) => {
        if (m.id === meaningId) {
          return {
            ...m,
            annotations: (m.annotations || []).filter((a) => a.id !== annotationId),
            updated_at: now,
          };
        }
        return m;
      }),
      updated_at: now,
    };

    const updatedMap = { ...vocabularies, [vocabId]: updatedVocab };
    setVocabularies(updatedMap);
    await DatabaseService.saveVocabularies(updatedMap);
  };

  return (
    <NotebookContext.Provider
      value={{
        notebooks,
        vocabularies,
        isReady,
        findVocabularyByContent,
        getVocabularyById,
        getNotebookById,
        createNotebook,
        updateNotebook,
        deleteNotebook,
        saveVocabulary,
        updateVocabulary,
        deleteVocabulary,
        batchDeleteVocabularies,
        batchAddVocabulariesToNotebook,
        addMeaningToVocabulary,
        updateMeaning,
        deleteMeaning,
        addAnnotation,
        deleteAnnotation,
        reloadAll: loadAll,
      }}
    >
      {children}
    </NotebookContext.Provider>
  );
}

export function useNotebooks() {
  const ctx = useContext(NotebookContext);
  if (!ctx) {
    throw new Error('useNotebooks must be used within NotebookProvider');
  }
  return ctx;
}
