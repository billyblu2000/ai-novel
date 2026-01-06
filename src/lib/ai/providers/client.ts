/**
 * 客户端可用的 Provider 信息
 * 这个文件不包含任何 Node.js 专用模块，可以在客户端安全使用
 */

import type { AIModel } from "../types";

/**
 * Provider 基本信息
 */
export interface ProviderInfo {
  id: string;
  name: string;
  defaultBaseUrl: string;
}

/**
 * 所有可用的 Provider 信息
 */
export const PROVIDER_INFO: ProviderInfo[] = [
  {
    id: "siliconflow",
    name: "SiliconFlow",
    defaultBaseUrl: "https://api.siliconflow.cn/v1",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
];

/**
 * SiliconFlow 推荐模型
 */
export const SILICONFLOW_MODELS: AIModel[] = [
  {
    id: "Qwen/Qwen3-235B-A22B",
    name: "Qwen3 235B A22B",
    description: "通义千问 3 旗舰模型，235B 参数，A22B 激活",
    contextLength: 131072,
  },
  {
    id: "deepseek-ai/DeepSeek-V3",
    name: "DeepSeek V3",
    description: "DeepSeek 最新 V3 模型",
    contextLength: 65536,
  },
  {
    id: "deepseek-ai/DeepSeek-R1",
    name: "DeepSeek R1",
    description: "DeepSeek 推理模型",
    contextLength: 65536,
  },
  {
    id: "Pro/deepseek-ai/DeepSeek-R1",
    name: "DeepSeek R1 Pro",
    description: "DeepSeek R1 专业版，更强的推理能力",
    contextLength: 65536,
  },
];

/**
 * Gemini 可用模型
 */
export const GEMINI_MODELS: AIModel[] = [
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "强大的多模态模型，支持免费和付费 API",
    contextLength: 1048576,
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    description: "全球领先的多模态理解模型，仅支持付费 API",
    contextLength: 1048576,
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    description: "最智能的模型，专为速度而打造",
    contextLength: 1048576,
  },
];

/**
 * Gemini 仅付费模型
 */
export const GEMINI_PAID_ONLY_MODELS = ["gemini-3-pro-preview"];

/**
 * 获取所有 Provider 信息
 */
export function getAllProviderInfo(): ProviderInfo[] {
  return PROVIDER_INFO;
}

/**
 * 获取指定 Provider 的推荐模型列表
 */
export function getRecommendedModels(providerId: string): AIModel[] {
  switch (providerId) {
    case "siliconflow":
      return SILICONFLOW_MODELS;
    case "gemini":
      return GEMINI_MODELS;
    default:
      return [];
  }
}

/**
 * 获取 Provider 的默认模型
 */
export function getDefaultModelForProvider(providerId: string): string | null {
  switch (providerId) {
    case "siliconflow":
      return "Qwen/Qwen3-235B-A22B";
    case "gemini":
      return "gemini-3-flash-preview";
    default:
      return null;
  }
}

/**
 * 检查模型是否需要付费 Key (仅 Gemini)
 */
export function isGeminiPaidOnlyModel(modelId: string): boolean {
  return GEMINI_PAID_ONLY_MODELS.includes(modelId);
}
