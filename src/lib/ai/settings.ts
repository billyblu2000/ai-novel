/**
 * AI 设置管理
 * 负责 localStorage 读写和 API Key 加密/解密
 */

import type { AISettings, AIFunction, FunctionModelConfig } from "./types";
import { DEFAULT_AI_SETTINGS } from "./types";

// localStorage key
const STORAGE_KEY = "ai-novel-ai-settings";

// 简单的加密密钥（实际生产环境应使用更安全的方式）
const ENCRYPTION_KEY = "ai-novel-studio-2026";

/**
 * 简单的 XOR 加密（用于 API Key）
 * 注意：这不是强加密，仅用于防止明文存储
 */
function xorEncrypt(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result); // Base64 编码
}

/**
 * XOR 解密
 */
function xorDecrypt(encoded: string, key: string): string {
  try {
    const text = atob(encoded); // Base64 解码
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  } catch {
    return "";
  }
}

/**
 * 加密 API Key
 */
export function encryptApiKey(apiKey: string): string {
  if (!apiKey) return "";
  return xorEncrypt(apiKey, ENCRYPTION_KEY);
}

/**
 * 解密 API Key
 */
export function decryptApiKey(encrypted: string): string {
  if (!encrypted) return "";
  return xorDecrypt(encrypted, ENCRYPTION_KEY);
}

/**
 * 从 localStorage 加载 AI 设置
 */
export function loadAISettings(): AISettings {
  if (typeof window === "undefined") {
    return DEFAULT_AI_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_AI_SETTINGS;
    }

    const parsed = JSON.parse(stored) as AISettings;

    // 解密所有 API Keys
    const decryptedProviders: AISettings["providers"] = {};
    for (const [providerId, config] of Object.entries(parsed.providers || {})) {
      decryptedProviders[providerId] = {
        ...config,
        apiKey: decryptApiKey(config.apiKey),
      };
    }

    return {
      ...DEFAULT_AI_SETTINGS,
      ...parsed,
      providers: decryptedProviders,
    };
  } catch (error) {
    console.error("Failed to load AI settings:", error);
    return DEFAULT_AI_SETTINGS;
  }
}

/**
 * 保存 AI 设置到 localStorage
 */
export function saveAISettings(settings: AISettings): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    // 加密所有 API Keys
    const encryptedProviders: AISettings["providers"] = {};
    for (const [providerId, config] of Object.entries(settings.providers)) {
      encryptedProviders[providerId] = {
        ...config,
        apiKey: encryptApiKey(config.apiKey),
      };
    }

    const toStore: AISettings = {
      ...settings,
      providers: encryptedProviders,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error("Failed to save AI settings:", error);
  }
}

/**
 * 更新单个 Provider 配置
 */
export function updateProviderSettings(
  providerId: string,
  apiKey: string,
  enabled: boolean,
  baseUrl?: string
): AISettings {
  const settings = loadAISettings();
  settings.providers[providerId] = {
    apiKey,
    enabled,
    baseUrl,
  };
  saveAISettings(settings);
  return settings;
}

/**
 * 更新功能模型配置
 */
export function updateFunctionModel(
  func: AIFunction,
  config: FunctionModelConfig | "auto"
): AISettings {
  const settings = loadAISettings();
  settings.functionModels[func] = config;
  saveAISettings(settings);
  return settings;
}

/**
 * 切换破限模式
 */
export function toggleJailbreak(enabled: boolean): AISettings {
  const settings = loadAISettings();
  settings.jailbreakEnabled = enabled;
  saveAISettings(settings);
  return settings;
}

/**
 * 重置所有 AI 设置
 */
export function resetAISettings(): AISettings {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_AI_SETTINGS;
}

/**
 * 获取第一个可用的 Provider
 */
export function getFirstAvailableProvider(
  settings: AISettings
): { providerId: string; apiKey: string; baseUrl?: string } | null {
  for (const [providerId, config] of Object.entries(settings.providers)) {
    if (config.enabled && config.apiKey) {
      return {
        providerId,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      };
    }
  }
  return null;
}

/**
 * 获取指定功能应该使用的 Provider 和 Model
 */
export function getProviderForFunction(
  settings: AISettings,
  func: AIFunction
): { providerId: string; model: string; apiKey: string; baseUrl?: string } | null {
  const funcConfig = settings.functionModels[func];

  if (funcConfig === "auto") {
    // 自动选择：使用第一个可用的 Provider
    const available = getFirstAvailableProvider(settings);
    if (!available) return null;

    // 默认模型
    const defaultModels: Record<string, string> = {
      siliconflow: "Pro/deepseek-ai/DeepSeek-V3",
      gemini: "gemini-2.5-flash-preview-05-20",
    };

    return {
      ...available,
      model: defaultModels[available.providerId] || "",
    };
  }

  // 使用指定的配置
  const providerConfig = settings.providers[funcConfig.provider];
  if (!providerConfig?.enabled || !providerConfig.apiKey) {
    return null;
  }

  return {
    providerId: funcConfig.provider,
    model: funcConfig.model,
    apiKey: providerConfig.apiKey,
    baseUrl: providerConfig.baseUrl,
  };
}
