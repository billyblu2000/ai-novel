import { OpenAICompatibleProvider } from "./base";
import type { AIModel, ProviderConfig, ChatParams, ProviderMessage } from "../types";

/**
 * Google Gemini Provider
 *
 * Gemini 支持 OpenAI 兼容 API
 * https://ai.google.dev/gemini-api/docs/openai
 */
export class GeminiProvider extends OpenAICompatibleProvider {
  id = "gemini";
  name = "Google Gemini";
  defaultBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";

  /**
   * Gemini 可用模型列表
   */
  static AVAILABLE_MODELS: AIModel[] = [
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
   * 需要付费 Key 的模型（其他模型优先使用免费 Key）
   */
  static PAID_ONLY_MODELS = ["gemini-3-pro-preview"];

  /**
   * 获取模型列表
   * Gemini 的 OpenAI 兼容 API 可能不支持 /models 端点，直接返回已知模型
   */
  async listModels(_apiKey: string, _baseUrl?: string): Promise<AIModel[]> {
    // Gemini OpenAI 兼容模式下，直接返回已知模型列表
    return GeminiProvider.AVAILABLE_MODELS;
  }

  /**
   * 验证 API Key
   * 通过发送一个简单的请求来验证
   */
  async validateKey(apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const url = `${this.getBaseUrl(baseUrl)}/models`;

      const response = await fetch(url, {
        method: "GET",
        headers: this.buildHeaders(apiKey),
      });

      // Gemini 可能返回 200 或其他状态码
      // 只要不是 401/403 就认为 key 有效
      return response.status !== 401 && response.status !== 403;
    } catch {
      // 网络错误等情况，尝试用简单请求验证
      try {
        const config: ProviderConfig = {
          id: this.id,
          apiKey,
          baseUrl,
          model: "gemini-3-flash-preview",
        };

        await this.chatSync(config, {
          messages: [{ role: "user", content: "Hi" }],
          maxTokens: 5,
        });

        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * 构建请求体
   * Gemini 的 OpenAI 兼容 API 有一些特殊要求
   */
  protected buildRequestBody(
    config: ProviderConfig,
    params: ChatParams,
    stream: boolean
  ): Record<string, unknown> {
    const body = super.buildRequestBody(config, params, stream);

    // Gemini 不支持某些参数，需要移除
    // 同时确保 model 使用正确的格式
    return {
      ...body,
      model: params.model || config.model || "gemini-3-flash-preview",
    };
  }

  /**
   * 格式化消息
   * Gemini 对 system 消息有特殊处理
   */
  protected formatMessages(
    messages: ProviderMessage[]
  ): Array<{ role: string; content: string }> {
    // Gemini OpenAI 兼容 API 支持 system role
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * 获取默认模型
   */
  static getDefaultModel(): string {
    return "gemini-3-flash-preview";
  }
}
