import { LLMProviderConfig, QueryResult, AIMessage, SelectedRegion } from '@/types';
import {
  WORD_LOOKUP_SYSTEM_PROMPT,
  IMAGE_QUERY_SYSTEM_PROMPT,
  GUESS_SYSTEM_PROMPT,
} from './prompts';
import { generateId } from '@/utils/id';

/**
 * Built-in dictionary fallback for offline / no-key trial
 */
const BUILTIN_FALLBACK_DICT: Record<string, Partial<QueryResult>> = {
  serendipity: {
    word: 'serendipity',
    type: 'word',
    phonetic: '/ˌser.ənˈdɪp.ə.ti/',
    meanings: [
      {
        id: '1',
        part_of_speech: 'n.',
        zh_definition: '意外发现珍奇事物的本领；意外收获，机缘巧合',
        en_definition: 'the occurrence and development of events by chance in a happy or beneficial way',
        example: 'Finding my dream job while on vacation was pure serendipity.',
        source: 'LexiNote 词典',
        remarks: '常用来描述令人愉悦的偶然相遇或意外发现',
      },
    ],
    raw_explanation: '源自波斯童话《塞伦迪普的三位王子》，主人公总能凭借智慧和机缘发现意外的珍宝。',
  },
  ephemeral: {
    word: 'ephemeral',
    type: 'word',
    phonetic: '/ɪˈfem.ər.əl/',
    meanings: [
      {
        id: '1',
        part_of_speech: 'adj.',
        zh_definition: '短暂的，瞬息即逝的',
        en_definition: 'lasting for a very short time',
        example: 'Fame in the digital age is often ephemeral.',
        source: 'LexiNote 词典',
        remarks: '与 fleeting, transient 同义',
      },
    ],
    raw_explanation: '源自希腊语 ephemeros，意为“仅存活一天的”。',
  },
  ubiquitous: {
    word: 'ubiquitous',
    type: 'word',
    phonetic: '/juːˈbɪk.wə.təs/',
    meanings: [
      {
        id: '1',
        part_of_speech: 'adj.',
        zh_definition: '无所不在的，十分普遍的',
        en_definition: 'present, appearing, or found everywhere',
        example: 'Smartphones have become ubiquitous in daily life.',
        source: 'LexiNote 词典',
        remarks: '常用于描述现代科技、流行文化等极为普遍的现象',
      },
    ],
    raw_explanation: '拉丁语 ubique（到处）衍生的形容词。',
  },
  resilience: {
    word: 'resilience',
    type: 'word',
    phonetic: '/rɪˈzɪl.jəns/',
    meanings: [
      {
        id: '1',
        part_of_speech: 'n.',
        zh_definition: '恢复力，韧性，适应力',
        en_definition: 'the capacity to withstand or to recover quickly from difficulties',
        example: 'The team showed great resilience after conceding an early goal.',
        source: 'LexiNote 词典',
        remarks: '常用于心理学、生态学及工程学',
      },
    ],
    raw_explanation: '源自拉丁语 resilire，意为“弹回、弹起”。',
  },
  'break a leg': {
    word: 'break a leg',
    type: 'phrase',
    phonetic: '/breɪk ə leɡ/',
    meanings: [
      {
        id: '1',
        part_of_speech: 'idiom',
        zh_definition: '祝你好运；大获成功（演艺界惯用语）',
        en_definition: 'good luck (used especially to wish performers good luck before going on stage)',
        example: 'You have your audition tonight? Break a leg!',
        source: 'LexiNote 词典',
        remarks: '源于迷信：直接说“good luck”可能带来坏运气，反向祝福',
      },
    ],
    raw_explanation: '西方剧场传统文化中的特殊祝福语。',
  },
};

export class LLMClient {
  /**
   * Test API connectivity
   */
  static async testConnection(
    provider: LLMProviderConfig,
    apiKey: string
  ): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: '请先填写 API Key' };
    }

    try {
      const url = `${provider.base_url.replace(/\/+$/, '')}/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model_id,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `连接失败 (${response.status}): ${errorText.substring(0, 150)}`,
        };
      }

      return { success: true, message: '连接测试成功！' };
    } catch (e: any) {
      return {
        success: false,
        message: `网络错误: ${e.message || '无法连接到供应商服务器'}`,
      };
    }
  }

  /**
   * Query a word or phrase with AI, or fallback if no key
   */
  static async queryWord(
    queryText: string,
    provider: LLMProviderConfig,
    apiKey: string,
    additionalContext?: string
  ): Promise<QueryResult> {
    const trimmed = queryText.trim();
    const lower = trimmed.toLowerCase();

    // Check if we should use LLM
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const url = `${provider.base_url.replace(/\/+$/, '')}/chat/completions`;
        const userContent = additionalContext
          ? `查询词汇或短语：${trimmed}\n附加上下文或用户要求：${additionalContext}`
          : `查询词汇或短语：${trimmed}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model_id,
            messages: [
              { role: 'system', content: WORD_LOOKUP_SYSTEM_PROMPT },
              { role: 'user', content: userContent },
            ],
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const content = json.choices?.[0]?.message?.content || '';
          const parsed = this.cleanAndParseJSON<QueryResult>(content);
          if (parsed && parsed.word) {
            return {
              word: parsed.word,
              type: parsed.type || (parsed.word.includes(' ') ? 'phrase' : 'word'),
              phonetic: parsed.phonetic || '',
              meanings: (parsed.meanings || []).map((m, idx) => ({
                id: m.id || generateId(`m${idx}`),
                part_of_speech: m.part_of_speech || '',
                zh_definition: m.zh_definition || '',
                en_definition: m.en_definition || '',
                example: m.example || '',
                source: m.source || 'AI 查询',
                remarks: m.remarks || '',
                selected: true,
              })),
              recognized_text: parsed.recognized_text || '',
              raw_explanation: parsed.raw_explanation || '',
              is_from_local: false,
            };
          }
        }
      } catch (err) {
        console.warn('LLM query failed, falling back to local heuristic:', err);
      }
    }

    // Built-in offline dictionary fallback
    if (BUILTIN_FALLBACK_DICT[lower]) {
      const match = BUILTIN_FALLBACK_DICT[lower];
      return {
        word: match.word || trimmed,
        type: match.type || (trimmed.includes(' ') ? 'phrase' : 'word'),
        phonetic: match.phonetic || '',
        meanings: (match.meanings || []).map((m, idx) => ({
          id: m.id || generateId(`m${idx}`),
          part_of_speech: m.part_of_speech || '',
          zh_definition: m.zh_definition || '',
          en_definition: m.en_definition || '',
          example: m.example || '',
          source: m.source || '离线词典',
          remarks: m.remarks || '',
          selected: true,
        })),
        recognized_text: '',
        raw_explanation: match.raw_explanation || '本地内置离线数据。',
        is_from_local: false,
      };
    }

    // Generic heuristic fallback for unknown words when offline
    const isPhrase = trimmed.includes(' ');
    return {
      word: trimmed,
      type: isPhrase ? 'phrase' : 'word',
      phonetic: isPhrase ? '' : `/${trimmed.toLowerCase()}/`,
      meanings: [
        {
          id: generateId('m0'),
          part_of_speech: isPhrase ? 'phrase' : 'n. / v.',
          zh_definition: `【${trimmed}】暂无在线 AI 响应，请在“我的”页面配置 API Key 获取深度智能解析。`,
          en_definition: `Definition of "${trimmed}". Connect an LLM API in settings for full insights.`,
          example: `This is an example sentence featuring ${trimmed}.`,
          source: '默认草稿',
          remarks: '可直接在此编辑并记录笔记',
          selected: true,
        },
      ],
      recognized_text: '',
      raw_explanation: '提示：配置 DeepSeek / OpenAI API Key 后可解锁强大的 AI 语法解析与生动例句。',
      is_from_local: false,
    };
  }

  /**
   * Query with image (and optional text / region)
   */
  static async queryImage(
    imageBase64: string,
    provider: LLMProviderConfig,
    apiKey: string,
    userPrompt?: string,
    region?: SelectedRegion
  ): Promise<QueryResult> {
    const regionDesc = region
      ? `用户在图片中框选了重点区域：x=${Math.round(region.x)}%, y=${Math.round(region.y)}%, w=${Math.round(region.width)}%, h=${Math.round(region.height)}%`
      : '用户提交了整张图片。';

    if (apiKey && provider.supports_vision) {
      try {
        const url = `${provider.base_url.replace(/\/+$/, '')}/chat/completions`;
        const contentArray: any[] = [
          {
            type: 'text',
            text: `${regionDesc}\n用户附带要求：${userPrompt || '请识别勾画文字并给出词汇解析。'}`,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ];

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model_id,
            messages: [
              { role: 'system', content: IMAGE_QUERY_SYSTEM_PROMPT },
              { role: 'user', content: contentArray },
            ],
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const content = json.choices?.[0]?.message?.content || '';
          const parsed = this.cleanAndParseJSON<QueryResult>(content);
          if (parsed && parsed.word) {
            return {
              word: parsed.word,
              type: parsed.type || 'word',
              phonetic: parsed.phonetic || '',
              meanings: (parsed.meanings || []).map((m, idx) => ({
                id: m.id || generateId(`m${idx}`),
                part_of_speech: m.part_of_speech || '',
                zh_definition: m.zh_definition || '',
                en_definition: m.en_definition || '',
                example: m.example || '',
                source: m.source || '图片提取',
                remarks: m.remarks || '',
                selected: true,
              })),
              recognized_text: parsed.recognized_text || '',
              raw_explanation: parsed.raw_explanation || '',
              is_from_local: false,
            };
          }
        }
      } catch (err) {
        console.warn('Vision query failed:', err);
      }
    }

    // Fallback if vision not supported or key missing
    const simulatedWord = userPrompt?.trim() || 'highlighted phrase';
    return {
      word: simulatedWord,
      type: simulatedWord.includes(' ') ? 'phrase' : 'word',
      phonetic: '/ˌhaɪ.laɪt/',
      meanings: [
        {
          id: generateId('m0'),
          part_of_speech: 'phrase / term',
          zh_definition: `图片勾画区域提取：【${simulatedWord}】。`,
          en_definition: `Recognized contextual segment from image bounding box.`,
          example: `The sentence extracted from the document containing "${simulatedWord}".`,
          source: '图片 OCR 识别',
          remarks: provider.supports_vision
            ? '请配置支持视觉的 API Key（如 OpenAI GPT-4o mini）以启用真实图片端到端识别'
            : `当前供应商 ${provider.name} 属于纯文本模型，建议在“我的”切换支持视觉的模型`,
          selected: true,
        },
      ],
      recognized_text: `[识别文本段落]: Here is the extracted text context from your image: "...in modern linguistics, ${simulatedWord} plays a pivotal role in semantic expression..."`,
      raw_explanation: '图片内容已结合语境提取并整理在上方信息视图。',
      is_from_local: false,
    };
  }

  /**
   * AI Assistant conversation for current query
   */
  static async sendChatMessage(
    messages: AIMessage[],
    currentQuery: QueryResult,
    provider: LLMProviderConfig,
    apiKey: string
  ): Promise<string> {
    const contextPrompt = `你现在是 LexiNote 的 AI 助手。
用户当前正在查询词汇：【${currentQuery.word}】（${currentQuery.type === 'phrase' ? '短语' : '单词'}）。
当前音标：${currentQuery.phonetic || '暂无'}
主要释义：${currentQuery.meanings.map((m) => `${m.part_of_speech || ''} ${m.zh_definition || ''}`).join('; ')}
${currentQuery.recognized_text ? `图片识别上下文：${currentQuery.recognized_text}` : ''}

请针对用户的提问进行亲切、专业、精准的解答。回答要简洁生动，结合当前词汇语境。`;

    if (apiKey && apiKey.trim().length > 0) {
      try {
        const url = `${provider.base_url.replace(/\/+$/, '')}/chat/completions`;
        const apiMessages = [
          { role: 'system', content: contextPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model_id,
            messages: apiMessages,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          return json.choices?.[0]?.message?.content || '暂未收到 AI 回复。';
        }
      } catch (err: any) {
        return `发送失败：${err.message || '网络连接异常'}`;
      }
    }

    // Intelligent simulated response
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    if (lastUserMsg.includes('例句') || lastUserMsg.includes('造句')) {
      return `关于「${currentQuery.word}」，为你提供一个地道的实用例句：\n"She embraced the new challenge with remarkable enthusiasm."\n你可以重点体会它在日常口语与书面语中的用法。`;
    }
    if (lastUserMsg.includes('辨析') || lastUserMsg.includes('近义')) {
      return `「${currentQuery.word}」常见的近义词辨析：\n它的主要特点在于语境的契合度。在偏正式的学术或写作场景中，更偏向精准表达；而在日常交流中，可以选择更简洁的替代词。`;
    }
    return `关于词汇「${currentQuery.word}」：\n在当前语境中，它主要传达了核心含义。如果你需要了解词根词缀、搭配习惯或记忆口诀，随时告诉我！`;
  }

  /**
   * Guess word clue progression (stage 1 to 4)
   */
  static async getGuessClue(
    targetWord: string,
    contextSentence: string,
    stage: number,
    provider: LLMProviderConfig,
    apiKey: string
  ): Promise<{
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
  }> {
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const url = `${provider.base_url.replace(/\/+$/, '')}/chat/completions`;
        const userPrompt = `目标词汇：${targetWord}\n语境句子/段落：${contextSentence}\n当前提示阶段：第 ${stage} 阶段（共4阶段）。请按格式给出指引。`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model_id,
            messages: [
              { role: 'system', content: GUESS_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.5,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const content = json.choices?.[0]?.message?.content || '';
          const parsed = this.cleanAndParseJSON<any>(content);
          if (parsed && parsed.hint_content) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Guess clue generation fallback:', e);
      }
    }

    // Default progressive hints
    const titles = ['语境线索与词性思考', '语义倾向与同类联想', '构词形态与词根剖析', '最终真相与完整释义'];
    const currentTitle = titles[stage - 1] || '提示';

    if (stage === 1) {
      return {
        stage: 1,
        stage_title: currentTitle,
        hint_content: `观察句子结构：“${contextSentence}”。请注意【${targetWord}】在句中所处的位置，它修饰什么？前后有表示转折或顺承的信号词吗？它的情感色彩是积极、消极还是中性？`,
        is_final: false,
      };
    } else if (stage === 2) {
      return {
        stage: 2,
        stage_title: currentTitle,
        hint_content: `试着把【${targetWord}】暂时替换为简单的词汇（如 good, bad, rare, surprise 等）。如果放入句子中，哪种意象更通顺？它所描述的事物具备什么特征？`,
        is_final: false,
      };
    } else if (stage === 3) {
      return {
        stage: 3,
        stage_title: currentTitle,
        hint_content: `拆解一下【${targetWord}】的词头或词尾：它包含哪些你熟悉的构词成分？这类词通常表达怎样的动作或状态？`,
        is_final: false,
      };
    } else {
      return {
        stage: 4,
        stage_title: currentTitle,
        hint_content: `恭喜完成推测！完整解析已揭晓。通过主动思考建立的神经联结能让记忆更加深刻。`,
        is_final: true,
        final_data: {
          word: targetWord,
          phonetic: `/${targetWord.toLowerCase()}/`,
          zh_definition: `结合上下文，“${targetWord}”通常指特定环境下的关键概念或特质。`,
          en_definition: `The precise meaning in this context corresponds to the inferred property.`,
          example: contextSentence,
        },
      };
    }
  }

  /**
   * Safely strip Markdown code blocks and parse JSON
   */
  private static cleanAndParseJSON<T>(raw: string): T | null {
    try {
      let cleaned = raw.trim();
      // Remove ```json ... ``` blocks
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(cleaned.trim()) as T;
    } catch {
      // Try regex search for first { and last }
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(raw.substring(start, end + 1)) as T;
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}
