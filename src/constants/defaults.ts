import { LLMProviderConfig, AppSettings, Notebook } from '@/types';

export const DEFAULT_NOTEBOOK_ID = 'nb_default';
export const GLOBAL_ROOT_NOTEBOOK_ID = 'nb_global_root';

export const INITIAL_NOTEBOOKS: Notebook[] = [
  {
    id: GLOBAL_ROOT_NOTEBOOK_ID,
    name: '全部词汇',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_global_root: true,
    children_type: 'vocabulary',
    child_notebook_ids: [],
    vocabulary_ids: [],
    tags: ['全局视图'],
  },
  {
    id: DEFAULT_NOTEBOOK_ID,
    name: '默认笔记',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_default: true,
    children_type: 'vocabulary',
    child_notebook_ids: [],
    vocabulary_ids: [],
    tags: ['默认'],
  },
];

export const PRESET_PROVIDERS: LLMProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek (Flash 多模态)',
    api_format: 'openai_compatible',
    base_url: 'https://api.deepseek.com',
    model_id: 'deepseek-flash',
    supports_vision: true,
    is_custom_base_url: false,
    is_custom_model_id: false,
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4o mini)',
    api_format: 'openai_compatible',
    base_url: 'https://api.openai.com/v1',
    model_id: 'gpt-4o-mini',
    supports_vision: true,
    is_custom_base_url: false,
    is_custom_model_id: false,
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    api_format: 'openai_compatible',
    base_url: 'https://api.siliconflow.cn/v1',
    model_id: 'deepseek-ai/DeepSeek-V3',
    supports_vision: false,
    is_custom_base_url: false,
    is_custom_model_id: false,
  },
  {
    id: 'moonshot',
    name: 'Moonshot (月之暗面)',
    api_format: 'openai_compatible',
    base_url: 'https://api.moonshot.cn/v1',
    model_id: 'moonshot-v1-8k',
    supports_vision: false,
    is_custom_base_url: false,
    is_custom_model_id: false,
  },
];

export const ACCENT_COLOR_PRESETS = [
  { name: '极光绿 (默认)', value: '#10B981' },
  { name: '经典蓝', value: '#2563EB' },
  { name: '科技靛', value: '#6366F1' },
  { name: '琥珀橙', value: '#F59E0B' },
  { name: '玫瑰绯', value: '#E11D48' },
  { name: '紫罗兰', value: '#8B5CF6' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme_mode: 'system',
  accent_color: '#10B981',
  font_size: 'medium',
  density: 'comfortable',
  default_notebook_id: DEFAULT_NOTEBOOK_ID,
  auto_record_extra_info: false,
  default_fields_to_save: {
    zh_definition: true,
    en_definition: true,
    phonetic: true,
    example: true,
    source: true,
    source_images: true,
    annotations: true,
    remarks: true,
  },
  active_provider_id: 'deepseek',
};
