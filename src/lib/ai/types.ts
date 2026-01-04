// AI Provider 相关类型定义

/**
 * AI 功能枚举
 */
export type AIFunction =
  | "polish" // 润色
  | "expand" // 扩写
  | "compress" // 缩写
  | "continue" // 续写
  | "plan" // 规划
  | "summarize" // 总结
  | "chat"; // 聊天

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

// ============ 用户设置相关类型 ============

/**
 * 单个 Provider 的用户配置
 */
export interface ProviderSettings {
  apiKey: string;
  baseUrl?: string;
  enabled: boolean;
}

/**
 * 功能模型配置
 */
export interface FunctionModelConfig {
  provider: string;
  model: string;
}

/**
 * AI 设置（存储在 localStorage）
 */
export interface AISettings {
  /** 各 Provider 的配置 */
  providers: {
    [providerId: string]: ProviderSettings;
  };

  /** 各功能使用的模型配置，'auto' 表示自动选择 */
  functionModels: {
    [K in AIFunction]: FunctionModelConfig | "auto";
  };

  /** 自定义 Prompt，null 表示使用默认 */
  customPrompts: {
    [K in AIFunction]?: string | null;
  };

  /** 破限模式是否启用 */
  jailbreakEnabled: boolean;
}

/**
 * 默认 AI 设置
 */
export const DEFAULT_AI_SETTINGS: AISettings = {
  providers: {},
  functionModels: {
    polish: "auto",
    expand: "auto",
    compress: "auto",
    continue: "auto",
    plan: "auto",
    summarize: "auto",
    chat: "auto",
  },
  customPrompts: {},
  jailbreakEnabled: false,
};

// ============ 上下文相关类型 ============

/**
 * 节点上下文
 */
export interface NodeContext {
  id: string;
  title: string;
  content: string;
  summary: string;
  type: "FOLDER" | "FILE";
}

/**
 * 用户添加的上下文项
 */
export type UserContextItem =
  | { type: "node"; nodeId: string; title: string; content: string }
  | { type: "selection"; text: string }
  | { type: "entity"; entityId: string; name: string; description: string };

/**
 * 实体简要信息（用于上下文）
 */
export interface EntityBrief {
  id: string;
  name: string;
  type: "CHARACTER" | "LOCATION" | "ITEM";
  description: string;
}

/**
 * AI 上下文
 */
export interface AIContext {
  /** 当前节点信息 */
  currentNode?: NodeContext;

  /** 用户手动添加的上下文 */
  userContexts: UserContextItem[];

  /** 相关实体 */
  relatedEntities: EntityBrief[];

  /** 前文摘要 */
  previousSummaries: string[];
}

// ============ API 请求/响应类型 ============

/**
 * AI Chat API 请求体
 */
export interface AIChatRequest {
  /** 功能类型 */
  function: AIFunction;

  /** Provider 配置 */
  provider: {
    id: string;
    apiKey: string;
    baseUrl?: string;
    model: string;
  };

  /** 消息列表 */
  messages: ChatMessage[];

  /** 是否启用破限模式 */
  jailbreak?: boolean;

  /** 上下文信息 */
  context?: AIContext;

  /** 选中的文字（修改类功能） */
  selectedText?: string;

  /** 是否流式响应 */
  stream?: boolean;

  /** 温度参数 */
  temperature?: number;

  /** 最大 token 数 */
  maxTokens?: number;
}

/**
 * AI Chat API 响应（非流式）
 */
export interface AIChatResponse {
  content: string;
  finishReason?: string;
}
