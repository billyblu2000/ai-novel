import type {
  AIProvider,
  AIModel,
  ProviderConfig,
  ChatParams,
  ChatResponse,
  ChatMessage,
} from "../types";

/**
 * OpenAI 兼容 API 的基类
 * SiliconFlow 和 Gemini 都支持 OpenAI Chat Completion API 格式
 */
export abstract class OpenAICompatibleProvider implements AIProvider {
  abstract id: string;
  abstract name: string;
  abstract defaultBaseUrl: string;

  /**
   * 获取实际使用的 Base URL
   */
  protected getBaseUrl(baseUrl?: string): string {
    return baseUrl || this.defaultBaseUrl;
  }

  /**
   * 构建请求头
   */
  protected buildHeaders(apiKey: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
  }

  /**
   * 验证 API Key
   * 通过调用 models 接口来验证
   */
  async validateKey(apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const models = await this.listModels(apiKey, baseUrl);
      return models.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取模型列表
   * 子类可以覆盖此方法以提供自定义实现
   */
  async listModels(apiKey: string, baseUrl?: string): Promise<AIModel[]> {
    const url = `${this.getBaseUrl(baseUrl)}/models`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.buildHeaders(apiKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }

    const data = await response.json();

    // OpenAI 格式的响应
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((model: { id: string; owned_by?: string }) => ({
        id: model.id,
        name: model.id,
        description: model.owned_by ? `by ${model.owned_by}` : undefined,
      }));
    }

    return [];
  }

  /**
   * 流式聊天
   */
  async *chat(
    config: ProviderConfig,
    params: ChatParams
  ): AsyncGenerator<string, void, unknown> {
    const url = `${this.getBaseUrl(config.baseUrl)}/chat/completions`;

    const body = this.buildRequestBody(config, params, true);

    const response = await fetch(url, {
      method: "POST",
      headers: this.buildHeaders(config.apiKey),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Chat request failed: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 处理 SSE 格式
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 非流式聊天
   */
  async chatSync(
    config: ProviderConfig,
    params: ChatParams
  ): Promise<ChatResponse> {
    const url = `${this.getBaseUrl(config.baseUrl)}/chat/completions`;

    const body = this.buildRequestBody(config, params, false);

    const response = await fetch(url, {
      method: "POST",
      headers: this.buildHeaders(config.apiKey),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Chat request failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.choices?.[0]?.message?.content || "",
      finishReason: data.choices?.[0]?.finish_reason,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * 构建请求体
   */
  protected buildRequestBody(
    config: ProviderConfig,
    params: ChatParams,
    stream: boolean
  ): Record<string, unknown> {
    return {
      model: params.model || config.model,
      messages: this.formatMessages(params.messages),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens,
      stream,
    };
  }

  /**
   * 格式化消息
   * 子类可以覆盖此方法以提供自定义格式
   */
  protected formatMessages(
    messages: ChatMessage[]
  ): Array<{ role: string; content: string }> {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}
