/**
 * AI Provider 相关类型定义
 */

/**
 * 聊天消息角色
 */
export type MessageRole = "system" | "user" | "assistant";

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * AI 模型信息
 */
export interface AIModel {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
}

/**
 * Provider 配置
 */
export interface ProviderConfig {
  id: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/**
 * Chat 请求参数
 */
export interface ChatParams {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * Chat 响应（非流式）
 */
export interface ChatResponse {
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * AI Provider 接口
 */
export interface AIProvider {
  /** Provider 唯一标识 */
  id: string;
  /** Provider 显示名称 */
  name: string;
  /** 默认 Base URL */
  defaultBaseUrl: string;

  /**
   * 验证 API Key 是否有效
   */
  validateKey(apiKey: string, baseUrl?: string): Promise<boolean>;

  /**
   * 获取可用模型列表
   */
  listModels(apiKey: string, baseUrl?: string): Promise<AIModel[]>;

  /**
   * 发送聊天请求（流式）
   */
  chat(
    config: ProviderConfig,
    params: ChatParams
  ): AsyncGenerator<string, void, unknown>;

  /**
   * 发送聊天请求（非流式）
   */
  chatSync(config: ProviderConfig, params: ChatParams): Promise<ChatResponse>;
}
