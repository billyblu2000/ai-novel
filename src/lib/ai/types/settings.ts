/**
 * AI 设置相关类型定义
 */

import type { AIFunction } from "./function";

/**
 * 单个 Provider 的用户配置
 */
export interface ProviderSettings {
  apiKey: string;
  baseUrl?: string;
  enabled: boolean;
}

/**
 * Gemini Provider 的特殊配置（支持免费/付费双 Key）
 */
export interface GeminiProviderSettings extends ProviderSettings {
  /** 免费 API Key（用于 Flash 模型） */
  freeApiKey?: string;
  /** 付费 API Key（用于 Pro 模型，也可用于 Flash） */
  paidApiKey?: string;
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

  /** Gemini 特殊配置（双 Key） */
  geminiSettings?: GeminiProviderSettings;

  /** 各功能使用的模型配置，'auto' 表示自动选择 */
  functionModels: {
    [K in AIFunction]: FunctionModelConfig | "auto";
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
  jailbreakEnabled: false,
};
