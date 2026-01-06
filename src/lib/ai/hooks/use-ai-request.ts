/**
 * AI 请求 Hook
 * 统一消息流架构下的 AI 请求处理
 */

import { useCallback, useRef } from "react";
import { useAIStore } from "@/lib/stores/ai-store";
import { getModelForFunction } from "@/lib/ai/settings";
import type {
  AIFunction,
  SpecialFunctionType,
  SpecialPayloadMap,
  UserContextItem,
  ProviderMessage,
  ModifyResult,
  PlanResult,
  ContinueResult,
  SummarizeResult,
} from "@/lib/ai/types";
import { isTextMessage, isModifyFunctionType } from "@/lib/ai/types";

/**
 * 普通聊天请求参数
 */
export interface ChatRequestParams {
  type: "chat";
  /** 用户输入 */
  userInput: string;
  /** 用户添加的上下文 */
  userContexts?: UserContextItem[];
}

/**
 * 特殊功能请求参数
 */
export interface SpecialRequestParams<
  T extends SpecialFunctionType = SpecialFunctionType
> {
  type: "special";
  /** 功能类型 */
  functionType: T;
  /** 功能所需的 Payload */
  payload: SpecialPayloadMap[T];
  /** 用户额外输入（可选） */
  userInstruction?: string;
  /** 用户添加的上下文（可选） */
  userContexts?: UserContextItem[];
}

/**
 * AI 请求参数
 */
export type AIRequestParams = ChatRequestParams | SpecialRequestParams;

/**
 * AI 请求结果
 */
export interface AIRequestResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * 解析修改功能的 JSON 输出
 */
function parseModifyResult(content: string): ModifyResult {
  try {
    const parsed = JSON.parse(content);
    if (parsed.result) {
      return {
        modifiedText: parsed.result,
        explanation: parsed.explanation,
      };
    }
  } catch {
    // 尝试从 markdown 代码块中提取 JSON
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.result) {
          return {
            modifiedText: parsed.result,
            explanation: parsed.explanation,
          };
        }
      } catch {
        // 解析失败
      }
    }
  }
  // 如果解析失败，将整个内容作为结果返回
  return { modifiedText: content.trim() };
}

/**
 * 解析规划功能的 JSON 输出
 */
function parsePlanResult(content: string): PlanResult | null {
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
    const result = JSON.parse(jsonStr);

    if (!result.children || !Array.isArray(result.children)) {
      return null;
    }

    const validChildren = result.children.filter(
      (child: { title?: string; summary?: string; type?: string }) =>
        typeof child.title === "string" &&
        typeof child.summary === "string" &&
        (child.type === "FOLDER" || child.type === "FILE")
    );

    if (validChildren.length === 0) return null;

    return {
      children: validChildren,
      explanation: result.explanation,
    };
  } catch {
    return null;
  }
}

/**
 * 解析续写功能的 JSON 输出
 */
function parseContinueResult(content: string): ContinueResult {
  try {
    const parsed = JSON.parse(content);
    if (parsed.result) {
      return { content: parsed.result };
    }
  } catch {
    // 尝试从 markdown 代码块中提取 JSON
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.result) {
          return { content: parsed.result };
        }
      } catch {
        // 解析失败
      }
    }
  }
  // 如果解析失败，将整个内容作为结果返回
  return { content: content.trim() };
}

/**
 * 解析总结功能的 JSON 输出
 */
function parseSummarizeResult(content: string): SummarizeResult {
  try {
    const parsed = JSON.parse(content);
    if (parsed.result) {
      return { summary: parsed.result };
    }
  } catch {
    // 尝试从 markdown 代码块中提取 JSON
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.result) {
          return { summary: parsed.result };
        }
      } catch {
        // 解析失败
      }
    }
  }
  // 如果解析失败，将整个内容作为结果返回
  return { summary: content.trim() };
}

/**
 * useAIRequest Hook
 * 提供统一的 AI 请求接口
 */
export function useAIRequest() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    isLoading,
    isStreaming,
    debugMode,
    currentProject,
    chatHistory,
    settings,
    setLoading,
    setStreaming,
    setStreamingChatContent,
    appendStreamingChatContent,
    setError,
    setLastRequestDebug,
    addTextMessage,
    addSpecialRequest,
    addSpecialResult,
    updateSpecialResult,
  } = useAIStore();

  /**
   * 发送 AI 请求
   */
  const sendRequest = useCallback(
    async (params: AIRequestParams): Promise<AIRequestResult> => {
      const isChat = params.type === "chat";
      const functionType: AIFunction = isChat ? "chat" : params.functionType;

      // 获取模型配置
      const modelConfig = getModelForFunction(functionType);
      if (!modelConfig) {
        const error = "未找到可用的 AI 服务商，请先配置 API Key";
        setError(error);
        return { success: false, error };
      }

      // 验证参数
      if (isChat && !params.userInput.trim()) {
        return { success: false, error: "请输入内容" };
      }

      setLoading(true);
      setError(null);

      try {
        abortControllerRef.current = new AbortController();

        let requestMessageId: string | undefined;
        let resultMessageId: string | undefined;

        // 根据类型添加消息到历史
        if (isChat) {
          // 普通聊天：添加用户文本消息（包含参考内容用于显示）
          const userMessage = addTextMessage("user", params.userInput, params.userContexts);
          requestMessageId = userMessage.id;
        } else {
          // 特殊功能：添加特殊请求消息
          const specialParams = params as SpecialRequestParams;
          const requestMessage = addSpecialRequest(
            specialParams.functionType,
            specialParams.payload,
            specialParams.userInstruction,
            specialParams.userContexts
          );
          requestMessageId = requestMessage.id;

          // 添加特殊结果消息（初始状态）
          const resultMessage = addSpecialResult(
            specialParams.functionType,
            requestMessageId
          );
          resultMessageId = resultMessage.id;
        }

        // 构建历史消息（只取文本消息用于上下文）
        const historyMessages: ProviderMessage[] = chatHistory
          .filter(isTextMessage)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

        // 构建请求体（使用新的 API 格式）
        const requestBody: Record<string, unknown> = {
          requestType: isChat ? "chat" : "special",
          provider: {
            id: modelConfig.provider,
            apiKey: modelConfig.apiKey,
            baseUrl: modelConfig.baseUrl,
            model: modelConfig.model,
          },
          messages: historyMessages,
          project: currentProject || undefined,
          jailbreak: settings.jailbreakEnabled,
          stream: true,
        };

        if (isChat) {
          // 普通聊天
          requestBody.userInput = params.userInput;
          requestBody.userContexts = params.userContexts || [];
        } else {
          // 特殊功能
          const specialParams = params as SpecialRequestParams;
          requestBody.functionType = specialParams.functionType;
          requestBody.payload = specialParams.payload;
          requestBody.userInput = specialParams.userInstruction || "";
          requestBody.userContexts = specialParams.userContexts || [];
        }

        // 发送请求
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "请求失败");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("无法读取响应流");
        }

        setLoading(false);
        setStreaming(true, resultMessageId);
        
        // 普通聊天时，清空流式内容
        if (isChat) {
          setStreamingChatContent("");
        }

        // 处理流式响应
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                // 处理 debug 信息
                if (parsed.debug && debugMode) {
                  setLastRequestDebug(parsed.debug);
                }
                // 处理内容
                if (parsed.content) {
                  fullContent += parsed.content;

                  if (isChat) {
                    // 普通聊天：更新流式内容
                    appendStreamingChatContent(parsed.content);
                  } else if (resultMessageId) {
                    // 特殊功能：更新流式内容
                    updateSpecialResult(resultMessageId, {
                      streamingContent: fullContent,
                    });
                  }
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }

        // 流式结束后处理
        if (isChat) {
          // 普通聊天：添加 AI 回复消息
          addTextMessage("assistant", fullContent);
        } else if (resultMessageId) {
          // 特殊功能：解析结果并更新
          const specialParams = params as SpecialRequestParams;
          const ft = specialParams.functionType;

          if (isModifyFunctionType(ft)) {
            const result = parseModifyResult(fullContent);
            updateSpecialResult(resultMessageId, {
              result: result as Partial<
                import("@/lib/ai/types").SpecialResultMap[typeof ft]
              >,
              isStreaming: false,
              streamingContent: undefined,
            });
          } else if (ft === "plan") {
            const result = parsePlanResult(fullContent);
            if (result) {
              updateSpecialResult(resultMessageId, {
                result: result as Partial<
                  import("@/lib/ai/types").SpecialResultMap["plan"]
                >,
                isStreaming: false,
                streamingContent: undefined,
              });
            } else {
              setError("无法解析规划结果，请重试");
            }
          } else if (ft === "continue") {
            const result = parseContinueResult(fullContent);
            updateSpecialResult(resultMessageId, {
              result: result as Partial<
                import("@/lib/ai/types").SpecialResultMap["continue"]
              >,
              isStreaming: false,
              streamingContent: undefined,
            });
          } else if (ft === "summarize") {
            const result = parseSummarizeResult(fullContent);
            updateSpecialResult(resultMessageId, {
              result: result as Partial<
                import("@/lib/ai/types").SpecialResultMap["summarize"]
              >,
              isStreaming: false,
              streamingContent: undefined,
            });
          }
        }

        setStreaming(false);
        return {
          success: true,
          messageId: resultMessageId || requestMessageId,
        };
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setStreaming(false);
          return { success: false, error: "请求已取消" };
        }
        const errorMessage = (error as Error).message;
        setError(errorMessage);
        setLoading(false);
        setStreaming(false);
        return { success: false, error: errorMessage };
      } finally {
        abortControllerRef.current = null;
      }
    },
    [
      debugMode,
      currentProject,
      chatHistory,
      settings.jailbreakEnabled,
      setLoading,
      setStreaming,
      setStreamingChatContent,
      appendStreamingChatContent,
      setError,
      setLastRequestDebug,
      addTextMessage,
      addSpecialRequest,
      addSpecialResult,
      updateSpecialResult,
    ]
  );

  /**
   * 停止当前请求
   */
  const stopRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
  }, [setStreaming]);

  /**
   * 标记特殊结果为已应用
   */
  const markAsApplied = useCallback(
    (messageId: string) => {
      updateSpecialResult(messageId, { applied: true });
    },
    [updateSpecialResult]
  );

  return {
    sendRequest,
    stopRequest,
    markAsApplied,
    isLoading,
    isStreaming,
  };
}
