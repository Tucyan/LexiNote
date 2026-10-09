import {
  LLMProviderConfig,
  QueryResult,
  AIMessage,
  SelectedRegion,
  QueryFeedback,
  QueryFeedbackType,
  QuerySuggestionItem,
} from '@/types';
import * as FileSystem from 'expo-file-system';
import {
  WORD_LOOKUP_SYSTEM_PROMPT,
  IMAGE_QUERY_SYSTEM_PROMPT,
  GUESS_SYSTEM_PROMPT,
} from './prompts';
import { generateId } from '@/utils/id';
import { LLMErrorType, LLMException } from './errors';

export { LLMErrorType, LLMException };

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
    raw_explanation: '源自拉丁语 ubique，意为“到处、在任何地方”。',
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
   * Helper: Classify HTTP status and error text into structured LLMException
   */
  static classifyHttpError(status: number, errorText: string, modelId: string): LLMException {
    let cleanMsg = '';
    try {
      const parsed = JSON.parse(errorText);
      cleanMsg = parsed.error?.message || parsed.message || errorText;
    } catch {
      cleanMsg = errorText.slice(0, 200);
    }

    if (status === 401 || status === 403) {
      return new LLMException(
        LLMErrorType.AUTHENTICATION_FAILED,
        `API Key 鉴权失败 (${status}): ${cleanMsg}`,
        '您的 API Key 无效、已过期或无权调用该模型。\n请前往「我的 -> 供应商配置」核对密钥内容。',
        status
      );
    }
    if (status === 429) {
      return new LLMException(
        LLMErrorType.RATE_LIMIT_EXCEEDED,
        `调用频次受限或额度不足 (429): ${cleanMsg}`,
        '模型服务商接口返回 429。\n可能原因：账户余额不足欠费，或触发了短时请求速率上限。请检查服务商账户额度。',
        status
      );
    }
    if (status === 404) {
      return new LLMException(
        LLMErrorType.MODEL_NOT_FOUND,
        `模型或服务路径不存在 (404): ${cleanMsg}`,
        `未找到模型「${modelId}」或请求端点路径错误。\n请前往「我的 -> 供应商配置」检查 Model ID 和 Base URL 是否拼写正确。`,
        status
      );
    }
    if (status >= 500) {
      return new LLMException(
        LLMErrorType.SERVER_ERROR,
        `模型提供商服务器错误 (${status}): ${cleanMsg}`,
        '大模型供应商服务器发生内部故障或当前负载过高，请稍后重新发起查询。',
        status
      );
    }
    return new LLMException(
      LLMErrorType.UNKNOWN_ERROR,
      `API 调用失败 (${status}): ${cleanMsg}`,
      '请检查模型配置与网络连接。',
      status
    );
  }

  /**
   * Helper: Default titles for LLM input feedback types
   */
  static getDefaultFeedbackTitle(type: QueryFeedbackType): string {
    switch (type) {
      case 'misspelling':
        return '单词可能存在拼写错误';
      case 'long_text':
        return '检测到长篇英文段落';
      case 'irrelevant_content':
        return '内容偏离英语词汇学习';
      case 'gibberish':
        return '未识别有效词汇内容';
      case 'chinese_lookup':
        return '已为您匹配对应英文词汇';
      default:
        return '输入内容提示';
    }
  }

  /**
   * Test API connectivity
   */
  static async testConnection(
    provider: LLMProviderConfig,
    apiKey: string
  ): Promise<{ success: boolean; message: string }> {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, message: '请先填写 API Key' };
    }

    const cleanBaseUrl = provider.base_url.trim().replace(/\/+$/, '');
    if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
      return { success: false, message: 'Base URL 必须以 http:// 或 https:// 开头' };
    }

    try {
      const url = `${cleanBaseUrl}/chat/completions`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: provider.model_id,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const classified = this.classifyHttpError(response.status, errorText, provider.model_id);
        return {
          success: false,
          message: `${classified.message}\n${classified.suggestion || ''}`,
        };
      }

      return { success: true, message: '连接测试成功！模型响应正常。' };
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return { success: false, message: '连接超时（超过 12 秒），请检查网络或服务地址是否可达。' };
      }
      return {
        success: false,
        message: `网络错误: ${e.message || '无法连接到供应商服务器，请检查网络或 Base URL'}`,
      };
    }
  }

  /**
   * Query a word or phrase with AI, with strict input validation and descriptive error reporting
   */
  static async queryWord(
    queryText: string,
    provider: LLMProviderConfig,
    apiKey: string,
    additionalContext?: string
  ): Promise<QueryResult> {
    const trimmed = queryText.trim();
    const lower = trimmed.toLowerCase();

    // 1. Input pre-validation
    if (!trimmed) {
      throw new LLMException(
        LLMErrorType.EMPTY_INPUT,
        '非法操作：查询词汇不能为空',
        '请输入需要查询的英文单词或短语。'
      );
    }
    if (trimmed.length > 3000) {
      throw new LLMException(
        LLMErrorType.INPUT_TOO_LONG,
        '非法操作：输入文本过长',
        '单次词汇查询限制在 3000 字符以内。请截取核心内容后重试。'
      );
    }

    // 2. Online LLM Query
    if (apiKey && apiKey.trim().length > 0) {
      const cleanBaseUrl = provider.base_url.trim().replace(/\/+$/, '');
      if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
        throw new LLMException(
          LLMErrorType.INVALID_BASE_URL,
          '非法操作：Base URL 格式错误',
          '服务地址必须以 http:// 或 https:// 开头，请在「我的 -> 供应商配置」中修正。'
        );
      }

      const url = `${cleanBaseUrl}/chat/completions`;
      const userContent = additionalContext
        ? `查询词汇或短语：${trimmed}\n附加上下文或用户要求：${additionalContext}`
        : `查询词汇或短语：${trimmed}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: provider.model_id,
            messages: [
              { role: 'system', content: WORD_LOOKUP_SYSTEM_PROMPT },
              { role: 'user', content: userContent },
            ],
            temperature: 0.3,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw this.classifyHttpError(response.status, errorText, provider.model_id);
        }

        const json = await response.json();
        const content = json.choices?.[0]?.message?.content || '';
        const parsed = this.cleanAndParseJSON<any>(content);

        // 1. Check if LLM returned structured error or suggestion feedback
        if (
          parsed &&
          (parsed.status === 'error' ||
            parsed.error_type ||
            (Array.isArray(parsed.suggestions) &&
              parsed.suggestions.length > 0 &&
              (!parsed.meanings || parsed.meanings.length === 0)))
        ) {
          const feedbackType: QueryFeedbackType = (parsed.error_type as QueryFeedbackType) || 'misspelling';
          const suggestions: QuerySuggestionItem[] = (parsed.suggestions || [])
            .map((s: any) => ({
              word: typeof s === 'string' ? s : (s.word || ''),
              zh_hint: typeof s === 'object' ? s.zh_hint : undefined,
              reason: typeof s === 'object' ? s.reason : undefined,
            }))
            .filter((s: QuerySuggestionItem) => s.word && s.word.trim().length > 0);

          const suggestedWords: string[] =
            Array.isArray(parsed.suggested_words) && parsed.suggested_words.length > 0
              ? parsed.suggested_words
              : suggestions.map((s) => s.word);

          const feedback: QueryFeedback = {
            type: feedbackType,
            title: parsed.title || this.getDefaultFeedbackTitle(feedbackType),
            message: parsed.message || '输入内容需调整，请参考下方建议。',
            original_input: parsed.original_input || trimmed,
            suggestions,
            suggested_words: suggestedWords,
            action_hint: parsed.action_hint || '点击候选词即可一键查询',
          };

          return {
            word: parsed.word || trimmed,
            type: 'word',
            phonetic: '',
            meanings: [],
            recognized_text: parsed.recognized_text || '',
            raw_explanation: feedback.message,
            is_invalid: true,
            feedback,
            is_from_local: false,
          };
        }

        // 2. Normal successful word / phrase result
        if (parsed && (parsed.word || (parsed.meanings && parsed.meanings.length > 0))) {
          const word = parsed.word || trimmed;
          return {
            word,
            type: parsed.type || (word.includes(' ') ? 'phrase' : 'word'),
            phonetic: parsed.phonetic || '',
            meanings: (parsed.meanings || []).map((m: any, idx: number) => ({
              id: m.id || generateId(`m${idx}`),
              part_of_speech: m.part_of_speech || '',
              zh_definition: m.zh_definition || '',
              en_definition: m.en_definition || '',
              example: m.example || '',
              source: m.source || 'AI 查询',
              remarks: m.remarks || '',
              selected: true,
              definition_choice: 'zh',
            })),
            recognized_text: parsed.recognized_text || '',
            raw_explanation: parsed.raw_explanation || '',
            is_from_local: false,
          };
        } else {
          throw new LLMException(
            LLMErrorType.RESPONSE_PARSE_ERROR,
            '模型返回内容未能解析为标准词汇结构',
            '模型可能未按规范输出 JSON，请尝试重新发起查询或在 AI 伴学助手中直接提问。'
          );
        }
      } catch (err: any) {
        if (err instanceof LLMException) {
          throw err;
        }
        if (err.name === 'AbortError') {
          throw new LLMException(
            LLMErrorType.NETWORK_TIMEOUT,
            '查询请求超时（超过 35 秒）',
            '网络请求超时，请检查网络通畅度或自定义服务地址是否响应。'
          );
        }
        throw new LLMException(
          LLMErrorType.NETWORK_UNREACHABLE,
          `无法连接到模型服务器: ${err.message || '网络连接异常'}`,
          '请确认手机网络连接正常，或在「我的」中检查 Base URL 配置。'
        );
      }
    }

    // 3. Fallback: built-in offline dictionary match
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

    // 4. Missing API Key and not in offline dictionary: throw descriptive error
    throw new LLMException(
      LLMErrorType.API_KEY_MISSING,
      '未配置 API Key',
      `本地词库与内置基础词典中暂未收录「${trimmed}」。\n请前往「我的 -> 供应商配置」填写大模型 API Key（如 DeepSeek、OpenAI）以开启智能全库深度解析。`
    );
  }

  /**
   * Query with image (and optional text / region) with multimodal validation
   */
  static async queryImage(
    imageBase64: string,
    provider: LLMProviderConfig,
    apiKey: string,
    userPrompt?: string,
    region?: SelectedRegion
  ): Promise<QueryResult> {
    // 1. Image presence validation
    if (!imageBase64 || !imageBase64.trim()) {
      throw new LLMException(
        LLMErrorType.EMPTY_INPUT,
        '非法操作：未提供图片',
        '请先拍摄照片或从相册选择包含英文文字的图片后再提交。'
      );
    }

    // 2. Vision model capability validation
    if (!provider.supports_vision && (!userPrompt || !userPrompt.trim())) {
      throw new LLMException(
        LLMErrorType.VISION_UNSUPPORTED,
        '非法操作：当前模型不支持视觉识图',
        `当前选用的模型「${provider.model_id}」未启用视觉识别能力，无法直接解析纯图片。\n建议操作：\n1. 前往「我的 -> 供应商配置」开启「多模态视觉模型支持」；\n2. 或切换为具备识图能力的模型（如 deepseek-flash、GPT-4o）；\n3. 或切换至“图文结合”模式附加文字说明后再查询。`
      );
    }

    // 3. API Key validation
    if (!apiKey || !apiKey.trim()) {
      throw new LLMException(
        LLMErrorType.API_KEY_MISSING,
        '未配置 API Key',
        '图片识图与 OCR 提取需要借助云端视觉模型。\n请前往「我的 -> 供应商配置」填入您的 API Key。'
      );
    }

    const cleanBaseUrl = provider.base_url.trim().replace(/\/+$/, '');
    if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
      throw new LLMException(
        LLMErrorType.INVALID_BASE_URL,
        '非法操作：Base URL 格式错误',
        '服务地址必须以 http:// 或 https:// 开头，请在「我的」设置中修正。'
      );
    }

    const regionDesc = region
      ? `用户在图片中框选了重点区域：x=${Math.round(region.x)}%, y=${Math.round(region.y)}%, w=${Math.round(region.width)}%, h=${Math.round(region.height)}%`
      : '用户提交了整张图片。';

    const url = `${cleanBaseUrl}/chat/completions`;
    const dataUri = await this.ensureDataUri(imageBase64);
    const contentArray: any[] = [
      {
        type: 'text',
        text: `${regionDesc}\n用户附带要求：${userPrompt || '请识别勾画文字并给出词汇解析。'}`,
      },
      {
        type: 'image_url',
        image_url: {
          url: dataUri,
        },
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: provider.model_id,
          messages: [
            { role: 'system', content: IMAGE_QUERY_SYSTEM_PROMPT },
            { role: 'user', content: contentArray },
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw this.classifyHttpError(response.status, errorText, provider.model_id);
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content || '';
      const parsed = this.cleanAndParseJSON<QueryResult>(content);

      if (parsed && parsed.word) {
        return {
          word: parsed.word,
          type: parsed.type || 'word',
          phonetic: parsed.phonetic || '',
          meanings: (parsed.meanings || []).map((m: any, idx: number) => ({
            id: m.id || generateId(`m${idx}`),
            part_of_speech: m.part_of_speech || '',
            zh_definition: m.zh_definition || '',
            en_definition: m.en_definition || '',
            example: m.example || '',
            source: m.source || '图片提取',
            remarks: m.remarks || '',
            selected: true,
            definition_choice: 'zh',
          })),
          recognized_text: parsed.recognized_text || '',
          raw_explanation: parsed.raw_explanation || '',
          is_from_local: false,
        };
      } else {
        throw new LLMException(
          LLMErrorType.RESPONSE_PARSE_ERROR,
          '图片文字提取结果未能解析为词汇结构',
          '模型已接收图片但未提取出有效的词汇字段，请确保图片文字清晰或在图片上准确勾画文字区域。'
        );
      }
    } catch (err: any) {
      if (err instanceof LLMException) throw err;
      if (err.name === 'AbortError') {
        throw new LLMException(
          LLMErrorType.NETWORK_TIMEOUT,
          '图片识别请求超时（超过 40 秒）',
          '图片解析耗时过长，可能是图片尺寸过大或网络较慢。请尝试裁剪重点区域后再试。'
        );
      }
      throw new LLMException(
        LLMErrorType.NETWORK_UNREACHABLE,
        `网络连接异常: ${err.message || '无法连接到模型服务'}`,
        '请确认手机网络连接正常。'
      );
    }
  }

  /**
   * AI Assistant conversation for current query with real-time streaming support
   */
  static async sendChatMessage(
    messages: AIMessage[],
    currentQuery: QueryResult,
    provider: LLMProviderConfig,
    apiKey: string,
    onChunk?: (chunkText: string) => void
  ): Promise<string> {
    // 1. Validation checks
    if (!messages || messages.length === 0) {
      throw new LLMException(
        LLMErrorType.EMPTY_INPUT,
        '非法操作：对话消息列表为空',
        '请在输入框中输入您想咨询的问题。'
      );
    }

    const lastUserMsg = messages[messages.length - 1];
    if (!lastUserMsg || !lastUserMsg.content || !lastUserMsg.content.trim()) {
      throw new LLMException(
        LLMErrorType.EMPTY_INPUT,
        '非法操作：发送内容不能为空',
        '请输入提问或探讨的问题内容后再发送。'
      );
    }

    if (lastUserMsg.content.length > 2000) {
      throw new LLMException(
        LLMErrorType.INPUT_TOO_LONG,
        '非法操作：输入内容过长',
        '单次对话限制在 2000 字符以内，请精简后重试。'
      );
    }

    if (!apiKey || apiKey.trim().length === 0) {
      // If no API key, provide simulated response with progressive streaming
      const simulated = this.generateSimulatedReply(currentQuery, lastUserMsg.content);
      if (onChunk) {
        await this.streamSimulatedText(simulated, onChunk);
      }
      return simulated;
    }

    // 2. Online streaming with OpenAI-compatible SSE
    const contextPrompt = `你现在是 LexiNote 的 AI 伴学助手。
用户当前正在查询词汇：【${currentQuery.word}】（${currentQuery.type === 'phrase' ? '短语' : '单词'}）。
当前音标：${currentQuery.phonetic || '暂无'}
主要释义：${currentQuery.meanings.map((m) => `${m.part_of_speech || ''} ${m.zh_definition || ''}`).join('; ')}
${currentQuery.recognized_text ? `图片识别上下文：${currentQuery.recognized_text}` : ''}

请针对用户的提问进行亲切、专业、精准的解答。回答要简洁生动，结合当前词汇语境。`;

    const apiMessages = [
      { role: 'system', content: contextPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const cleanBaseUrl = provider.base_url.trim().replace(/\/+$/, '');
    const url = `${cleanBaseUrl}/chat/completions`;

    // Attempt real SSE stream if onChunk callback provided
    if (onChunk) {
      try {
        let fullContent = '';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 40000);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            model: provider.model_id,
            messages: apiMessages,
            temperature: 0.7,
            stream: true,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          throw this.classifyHttpError(response.status, errText, provider.model_id);
        }

        // Read stream chunks
        if (response.body && typeof (response.body as any).getReader === 'function') {
          const reader = (response.body as any).getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) {
                    fullContent += delta;
                    onChunk(delta);
                  }
                } catch {
                  // Partial json chunk, continue
                }
              }
            }
          }
          if (fullContent.trim()) {
            return fullContent;
          }
        } else {
          // If body reader is not exposed by environment, read text and parse SSE lines
          const rawText = await response.text();
          if (rawText.includes('data: ')) {
            const lines = rawText.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) {
                    fullContent += delta;
                    onChunk(delta);
                  }
                } catch {}
              }
            }
            if (fullContent.trim()) return fullContent;
          }
          // Non-stream plain JSON fallback
          const parsed = JSON.parse(rawText);
          const reply = parsed.choices?.[0]?.message?.content || '';
          await this.streamSimulatedText(reply, onChunk);
          return reply;
        }
      } catch (streamErr: any) {
        if (streamErr instanceof LLMException) {
          throw streamErr;
        }
        console.warn('Stream failed, falling back to standard request:', streamErr);
      }
    }

    // Standard non-streaming request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: provider.model_id,
          messages: apiMessages,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw this.classifyHttpError(response.status, errText, provider.model_id);
      }

      const json = await response.json();
      const reply = json.choices?.[0]?.message?.content || '暂未收到 AI 回复。';
      if (onChunk) {
        await this.streamSimulatedText(reply, onChunk);
      }
      return reply;
    } catch (e: any) {
      if (e instanceof LLMException) throw e;
      if (e.name === 'AbortError') {
        throw new LLMException(
          LLMErrorType.NETWORK_TIMEOUT,
          '请求超时（超过 35 秒）',
          'AI 助手响应超时，请检查网络通畅度或重试。'
        );
      }
      throw new LLMException(
        LLMErrorType.NETWORK_UNREACHABLE,
        `网络连接异常: ${e.message || '无法连接到模型服务'}`,
        '请确认手机网络连接正常，或在「我的」中检查 Base URL 配置。'
      );
    }
  }

  /**
   * Helper: simulate typewriter effect
   */
  private static async streamSimulatedText(text: string, onChunk: (chunk: string) => void) {
    const chunkSize = 2;
    for (let i = 0; i < text.length; i += chunkSize) {
      onChunk(text.slice(i, i + chunkSize));
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  }

  /**
   * Helper: generate simulated offline reply
   */
  private static generateSimulatedReply(currentQuery: QueryResult, userText: string): string {
    if (userText.includes('例句') || userText.includes('造句')) {
      return `关于「${currentQuery.word}」，为你提供一个地道的实用例句：\n"She embraced the new challenge with remarkable enthusiasm."\n你可以重点体会它在日常口语与书面语中的用法。`;
    }
    if (userText.includes('辨析') || userText.includes('近义')) {
      return `「${currentQuery.word}」常见的近义词辨析：\n它的主要特点在于语境契合度。在正式学术写作中更偏向精准表达；在日常交流中可以选择更简洁的替代词。`;
    }
    return `关于词汇「${currentQuery.word}」：\n在当前语境中，它主要传达了核心含义。如果你需要了解词根词缀、搭配习惯或记忆口诀，随时告诉我！（提示：在“我的”页面配置 API Key 可解锁实时大模型解答）`;
  }

  /**
   * Guess word clue progression (stage 1 to 4) with validation
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
    if (!targetWord.trim() || !contextSentence.trim()) {
      throw new LLMException(
        LLMErrorType.EMPTY_INPUT,
        '非法操作：目标词汇或语境例句不能为空',
        '请输入需要推测的陌生单词以及其所在的语境句子。'
      );
    }

    if (apiKey && apiKey.trim().length > 0) {
      try {
        const cleanBaseUrl = provider.base_url.trim().replace(/\/+$/, '');
        const url = `${cleanBaseUrl}/chat/completions`;
        const userPrompt = `目标词汇：${targetWord}\n语境句子/段落：${contextSentence}\n当前提示阶段：第 ${stage} 阶段（共4阶段）。请按格式给出指引。`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: provider.model_id,
            messages: [
              { role: 'system', content: GUESS_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.5,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          const content = json.choices?.[0]?.message?.content || '';
          const parsed = this.cleanAndParseJSON<any>(content);
          if (parsed && parsed.hint_content) {
            return parsed;
          }
        } else {
          const errText = await response.text();
          throw this.classifyHttpError(response.status, errText, provider.model_id);
        }
      } catch (e: any) {
        if (e instanceof LLMException) throw e;
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
        hint_content: `【${targetWord}】的完整真相已解锁！结合之前的提示，你猜对了多少呢？`,
        is_final: true,
        final_data: {
          word: targetWord,
          phonetic: `/${targetWord.toLowerCase()}/`,
          zh_definition: `根据语境推测的释义：与所处情境紧密关联的特有含义。`,
          en_definition: `Contextual definition inferred from the passage.`,
          example: contextSentence,
        },
      };
    }
  }

  /**
   * Convert local image URI (e.g. file:///...) to Base64 data URI
   */
  private static async ensureDataUri(imageUri: string): Promise<string> {
    if (imageUri.startsWith('data:image')) {
      return imageUri;
    }
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64' as any,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (e) {
      console.warn('Failed to convert image to Base64 data URI via FileSystem:', e);
      return imageUri;
    }
  }

  /**
   * Utility to safely extract and parse JSON markdown block
   */
  private static cleanAndParseJSON<T>(raw: string): T | null {
    try {
      const trimmed = raw.trim();
      const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;
      return JSON.parse(jsonString);
    } catch (e) {
      console.warn('JSON parsing failed:', e, 'Raw output was:', raw);
      return null;
    }
  }
}
