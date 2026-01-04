import { OpenAICompatibleProvider } from "./base";
import type { AIModel, ProviderConfig, ChatParams, ChatMessage } from "../types";

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
      id: "gemini-2.0-flash-exp",
      name: "Gemini 2.0 Flash",
      description: "最新的 Gemini 2.0 Flash 模型，速度快",
      contextLength: 1048576,
    },
    {
      id: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash",
      description: "快速响应，适合日常任务",
      contextLength: 1048576,
    },
    {
      id: "gemini-1.5-flash-8b",
      name: "Gemini 1.5 Flash 8B",
      description: "轻量版本，更快速度",
      contextLength: 1048576,
    },
    {
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
      description: "高性能模型，适合复杂任务",
      contextLength: 2097152,
    },
    {
      id: "gemini-exp-1206",
      name: "Gemini Exp 1206",
      description: "实验性模型，最新功能",
      contextLength: 2097152,
    },
  ];

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
          model: "gemini-1.5-flash",
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
      model: params.model || config.model || "gemini-1.5-flash",
    };
  }

  /**
   * 格式化消息
   * Gemini 对 system 消息有特殊处理
   */
  protected formatMessages(
    messages: ChatMessage[]
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
    return "gemini-1.5-flash";
  }
}
