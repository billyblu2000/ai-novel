import type { AIProvider, AIModel, AIFunction } from "../types";
import { SiliconFlowProvider } from "./siliconflow";
import { GeminiProvider } from "./gemini";

/**
 * Provider 注册表
 * 管理所有可用的 AI Provider
 */
class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    // 注册默认 Provider
    this.register(new SiliconFlowProvider());
    this.register(new GeminiProvider());
  }

  /**
   * 注册一个 Provider
   */
  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * 获取指定 Provider
   */
  get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * 获取所有 Provider
   */
  getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 获取所有 Provider 的基本信息
   */
  getAllInfo(): Array<{ id: string; name: string; defaultBaseUrl: string }> {
    return this.getAll().map((p) => ({
      id: p.id,
      name: p.name,
      defaultBaseUrl: p.defaultBaseUrl,
    }));
  }

  /**
   * 检查 Provider 是否存在
   */
  has(id: string): boolean {
    return this.providers.has(id);
  }
}

// 单例实例
export const providerRegistry = new ProviderRegistry();

/**
 * 获取指定 Provider
 */
export function getProvider(id: string): AIProvider | undefined {
  return providerRegistry.get(id);
}

/**
 * 获取所有 Provider
 */
export function getAllProviders(): AIProvider[] {
  return providerRegistry.getAll();
}

/**
 * 获取所有 Provider 信息
 */
export function getAllProviderInfo(): Array<{
  id: string;
  name: string;
  defaultBaseUrl: string;
}> {
  return providerRegistry.getAllInfo();
}

/**
 * 自动选择 Provider 和模型
 * 根据功能类型和可用的 Provider 配置选择最合适的组合
 */
export function autoSelectProviderAndModel(
  _aiFunction: AIFunction,
  availableProviders: Array<{ id: string; apiKey: string; baseUrl?: string }>
): { providerId: string; model: string } | null {
  // 优先级：SiliconFlow > Gemini
  const priorityOrder = ["siliconflow", "gemini"];

  for (const providerId of priorityOrder) {
    const config = availableProviders.find((p) => p.id === providerId);
    if (config && config.apiKey) {
      const defaultModel = getDefaultModelForProvider(providerId);
      if (defaultModel) {
        return { providerId, model: defaultModel };
      }
    }
  }

  // 如果优先级列表中没有可用的，使用第一个可用的
  const firstAvailable = availableProviders.find((p) => p.apiKey);
  if (firstAvailable) {
    const defaultModel = getDefaultModelForProvider(firstAvailable.id);
    if (defaultModel) {
      return { providerId: firstAvailable.id, model: defaultModel };
    }
  }

  return null;
}

/**
 * 获取 Provider 的默认模型
 */
export function getDefaultModelForProvider(providerId: string): string | null {
  switch (providerId) {
    case "siliconflow":
      return SiliconFlowProvider.getDefaultModel();
    case "gemini":
      return GeminiProvider.getDefaultModel();
    default:
      return null;
  }
}

/**
 * 获取 Provider 的推荐模型列表
 */
export function getRecommendedModels(providerId: string): AIModel[] {
  switch (providerId) {
    case "siliconflow":
      return SiliconFlowProvider.RECOMMENDED_MODELS;
    case "gemini":
      return GeminiProvider.AVAILABLE_MODELS;
    default:
      return [];
  }
}

// 导出 Provider 类
export { SiliconFlowProvider } from "./siliconflow";
export { GeminiProvider } from "./gemini";
export { OpenAICompatibleProvider } from "./base";
