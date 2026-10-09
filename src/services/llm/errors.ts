/**
 * LLM Error Types and Custom Exceptions
 */

export enum LLMErrorType {
  // --- 前置校验：非法操作错误 ---
  EMPTY_INPUT = 'EMPTY_INPUT',                     // 非法操作：未输入任何文本或图片
  VISION_UNSUPPORTED = 'VISION_UNSUPPORTED',       // 非法操作：当前模型不支持多模态视觉但提交了纯图片
  INPUT_TOO_LONG = 'INPUT_TOO_LONG',               // 非法操作：输入字符过长（> 3000 字）
  INVALID_BASE_URL = 'INVALID_BASE_URL',           // 非法操作：服务地址格式错误（缺少 http/https）
  DUPLICATE_REQUEST = 'DUPLICATE_REQUEST',         // 非法操作：重复请求，前一条请求尚未完成
  INVALID_IMAGE = 'INVALID_IMAGE',                 // 非法操作：图片格式损坏或无法读取

  // --- 运行时凭据与配置错误 ---
  API_KEY_MISSING = 'API_KEY_MISSING',             // 缺失 API Key
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED', // HTTP 401/403：API Key 无效或过期
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',             // HTTP 404：模型 ID 不存在或接口路径错误

  // --- 服务端与配额错误 ---
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',     // HTTP 429：速率受限或额度耗尽
  INSUFFICIENT_QUOTA = 'INSUFFICIENT_QUOTA',       // 账户余额不足
  SERVER_ERROR = 'SERVER_ERROR',                   // HTTP 500/502/503：大模型服务提供商故障

  // --- 网络与传输错误 ---
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',             // 请求超时（> 30 秒）
  NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',     // 无法连接服务器/DNS解析失败

  // --- 解析与输出错误 ---
  RESPONSE_PARSE_ERROR = 'RESPONSE_PARSE_ERROR',   // 模型返回格式无法解析为词典数据
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',                 // 未知错误
}

export class LLMException extends Error {
  type: LLMErrorType;
  statusCode?: number;
  suggestion?: string;

  constructor(
    type: LLMErrorType,
    message: string,
    suggestion?: string,
    statusCode?: number
  ) {
    super(message);
    this.name = 'LLMException';
    this.type = type;
    this.suggestion = suggestion;
    this.statusCode = statusCode;
  }

  /**
   * Format human-readable title and message for UI alerts
   */
  getFormattedAlert(): { title: string; message: string } {
    let titlePrefix = '提示';
    switch (this.type) {
      case LLMErrorType.EMPTY_INPUT:
      case LLMErrorType.VISION_UNSUPPORTED:
      case LLMErrorType.INPUT_TOO_LONG:
      case LLMErrorType.INVALID_BASE_URL:
      case LLMErrorType.DUPLICATE_REQUEST:
        titlePrefix = '⚠️ 非法操作';
        break;
      case LLMErrorType.API_KEY_MISSING:
      case LLMErrorType.AUTHENTICATION_FAILED:
        titlePrefix = '🔑 密钥凭据错误';
        break;
      case LLMErrorType.RATE_LIMIT_EXCEEDED:
      case LLMErrorType.INSUFFICIENT_QUOTA:
        titlePrefix = '⏳ 配额与频次限制';
        break;
      case LLMErrorType.MODEL_NOT_FOUND:
        titlePrefix = '🔍 模型不存在';
        break;
      case LLMErrorType.SERVER_ERROR:
        titlePrefix = '☁️ 供应商服务异常';
        break;
      case LLMErrorType.NETWORK_TIMEOUT:
      case LLMErrorType.NETWORK_UNREACHABLE:
        titlePrefix = '📡 网络连接异常';
        break;
      case LLMErrorType.RESPONSE_PARSE_ERROR:
        titlePrefix = '📝 解析格式异常';
        break;
    }

    const fullMessage = this.suggestion
      ? `${this.message}\n\n💡 建议操作：\n${this.suggestion}`
      : this.message;

    return {
      title: titlePrefix,
      message: fullMessage,
    };
  }
}
