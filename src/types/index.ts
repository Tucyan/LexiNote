export type VocabularyType = 'word' | 'phrase';

export type QueryType = 'text' | 'image' | 'both';

export type ChildrenType = 'notebook' | 'vocabulary';

export interface Annotation {
  id: string;
  meaning_id: string;
  target_field?: 'zh_definition' | 'en_definition' | 'example' | 'source' | 'remarks';
  target_text?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Meaning {
  id: string;
  created_at: string;
  updated_at: string;
  part_of_speech?: string;
  zh_definition?: string;
  en_definition?: string;
  phonetic?: string;
  example?: string;
  source?: string;
  source_images?: string[];
  annotations?: Annotation[];
  remarks?: string;
}

export interface Vocabulary {
  id: string;
  type: VocabularyType;
  content: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  meanings: Meaning[];
}

export interface Notebook {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  is_default?: boolean;
  is_global_root?: boolean;
  parent_id?: string | null;
  /**
   * Rule: Direct children under the same parent must be uniform: either notebooks or vocabulary nodes.
   */
  children_type: ChildrenType;
  child_notebook_ids: string[];
  vocabulary_ids: string[];
}

export interface SelectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface QueryMeaningDraft {
  id: string;
  part_of_speech?: string;
  zh_definition?: string;
  en_definition?: string;
  example?: string;
  source?: string;
  remarks?: string;
  selected?: boolean;
  definition_choice?: 'zh' | 'en';
}

export type QueryFeedbackType =
  | 'misspelling'
  | 'long_text'
  | 'irrelevant_content'
  | 'gibberish'
  | 'chinese_lookup';

export interface QuerySuggestionItem {
  word: string;
  zh_hint?: string;
  reason?: string;
}

export interface QueryFeedback {
  type: QueryFeedbackType;
  title: string;
  message: string;
  original_input: string;
  suggestions: QuerySuggestionItem[];
  suggested_words: string[];
  action_hint?: string;
}

export interface QueryResult {
  word: string;
  type: VocabularyType;
  phonetic?: string;
  meanings: QueryMeaningDraft[];
  recognized_text?: string;
  raw_explanation?: string;
  is_from_local?: boolean;
  local_vocabulary_id?: string;
  is_invalid?: boolean;
  feedback?: QueryFeedback;
}

export interface SavedStatus {
  saved: boolean;
  vocabulary_id?: string;
  notebook_ids?: string[];
  saved_at?: string;
}

export interface QueryHistory {
  id: string;
  created_at: string;
  query_type: QueryType;
  input_text?: string;
  input_images?: string[];
  selected_regions?: SelectedRegion[];
  recognized_text?: string;
  query_results: QueryResult;
  ai_messages: AIMessage[];
  saved_content?: SavedStatus;
}

export interface LLMProviderConfig {
  id: string;
  name: string;
  api_format: 'openai_compatible';
  base_url: string;
  model_id: string;
  supports_vision: boolean;
  is_custom_base_url?: boolean;
  is_custom_model_id?: boolean;
}

export interface SaveFieldSelection {
  zh_definition: boolean;
  en_definition: boolean;
  phonetic: boolean;
  example: boolean;
  source: boolean;
  source_images: boolean;
  annotations: boolean;
  remarks: boolean;
}

export interface AppSettings {
  theme_mode: 'light' | 'dark' | 'system';
  accent_color: string;
  font_size: 'small' | 'medium' | 'large';
  density: 'comfortable' | 'compact';
  default_notebook_id: string;
  auto_record_extra_info: boolean;
  default_fields_to_save: SaveFieldSelection;
  active_provider_id: string;
}

export interface BackupData {
  version: string;
  export_date: string;
  vocabularies: Vocabulary[];
  notebooks: Notebook[];
  recent_queries: QueryHistory[];
  settings?: Partial<AppSettings>;
}
