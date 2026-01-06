import type {
  AIProvider,
  AIModel,
  ProviderConfig,
  ChatParams,
  ChatResponse,
  ProviderMessage,
} from "../types";
import { ProxyAgent, fetch as undiciFetch } from "undici";

/**
 * 获取代理配置的 fetch 函数
 * 如果设置了 HTTPS_PROXY 或 HTTP_PROXY 环境变量，则使用代理
 */
function getProxyAgent(): ProxyAgent | undefined {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    return new ProxyAgent(proxyUrl);
  }
  return undefined;
}

/**
 * 使用代理发送请求
 */
async function fetchWithProxy(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const proxyAgent = getProxyAgent();
  
  if (proxyAgent) {
    // 使用 undici 的 fetch 和代理
    const response = await undiciFetch(url, {
      ...init,
      dispatcher: proxyAgent,
    } as Parameters<typeof undiciFetch>[1]);
    
    // 转换为标准 Response
    return response as unknown as Response;
  }
  
  // 无代理时使用原生 fetch
  return fetch(url, init);
}

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

    const response = await fetchWithProxy(url, {
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

    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    console.log(`[${this.id}] Starting stream request to ${url}${proxyUrl ? ` (via proxy: ${proxyUrl})` : ''}`);

    const response = await fetchWithProxy(url, {
      method: "POST",
      headers: this.buildHeaders(config.apiKey),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[${this.id}] Request failed: ${response.status}`, error);
      throw new Error(`Chat request failed: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunkCount = 0;
    let totalContent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`[${this.id}] Stream ended normally. Total chunks: ${chunkCount}, Content length: ${totalContent.length}`);
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 处理 SSE 格式
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          if (trimmed === "data: [DONE]") {
            console.log(`[${this.id}] Received [DONE] signal`);
            continue;
          }

          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              const finishReason = json.choices?.[0]?.finish_reason;
              
              // 记录 finish_reason（可能是 stop, length, content_filter, safety 等）
              if (finishReason) {
                console.log(`[${this.id}] ⚠️ FINISH_REASON: ${finishReason} (content_filter/safety=审核拦截, stop=正常结束, length=超长度)`);
                // 如果是内容过滤，记录完整的响应以便调试
                if (finishReason === 'content_filter' || finishReason === 'safety' || finishReason === 'SAFETY') {
                  console.warn(`[${this.id}] 🚫 内容被审核拦截! 完整响应:`, JSON.stringify(json, null, 2));
                }
              }
              
              // 检查是否有错误信息
              if (json.error) {
                console.error(`[${this.id}] ❌ API Error in stream:`, JSON.stringify(json.error));
              }
              
              if (content) {
                chunkCount++;
                totalContent += content;
                yield content;
              }
            } catch (e) {
              // 记录解析错误，可能包含重要信息
              console.warn(`[${this.id}] Failed to parse SSE data:`, trimmed.slice(0, 200), e);
            }
          } else {
            // 非标准格式的行，可能是错误信息
            console.log(`[${this.id}] Non-data line:`, trimmed.slice(0, 200));
          }
        }
      }
      
      // 处理 buffer 中剩余的内容
      if (buffer.trim()) {
        console.log(`[${this.id}] Remaining buffer:`, buffer.slice(0, 200));
      }
    } catch (error) {
      console.error(`[${this.id}] Stream error:`, error);
      throw error;
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

    const response = await fetchWithProxy(url, {
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
      temperature: params.temperature ?? 1,
      max_tokens: params.maxTokens || 4096, // 默认 4K tokens
      stream,
    };
  }

  /**
   * 格式化消息
   * 子类可以覆盖此方法以提供自定义格式
   */
  protected formatMessages(
    messages: ProviderMessage[]
  ): Array<{ role: string; content: string }> {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}
