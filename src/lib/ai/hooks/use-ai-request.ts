/**
 * AI 请求 Hook
 * 封装 AI 请求的核心逻辑，简化组件代码
 */

import { useCallback, useRef } from "react";
import { useAIStore } from "@/lib/stores/ai-store";
import { getModelForFunction } from "@/lib/ai/settings";
import { parseModifyResult } from "@/lib/ai/prompts";
import type { AIFunction, AIContext, ChatMessage } from "@/lib/ai/types";
import { isModifyFunction } from "@/lib/ai/types";

/**
 * AI 请求参数
 */
export interface AIRequestParams {
  /** 功能类型 */
  function: AIFunction;
  /** 用户输入（可选，修改功能可以不需要） */
  userInput?: string;
  /** 聊天历史（聊天功能使用） */
  chatHistory?: ChatMessage[];
  /** 上下文 */
  context?: AIContext;
  /** 选中的文本（修改功能使用） */
  selectedText?: string;
  /** 增强上下文（修改功能使用） */
  enhancedContext?: {
    textBefore?: string;
    textAfter?: string;
    sceneSummary?: string;
    chapterSummary?: string;
    relatedEntityIds?: string[];
  };
  /** 是否启用破限模式 */
  jailbreak?: boolean;
}

/**
 * AI 请求结果
 */
export interface AIRequestResult {
  success: boolean;
  error?: string;
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
    setLoading,
    setStreaming,
    setStreamingContent,
    appendStreamingContent,
    setError,
    setLastRequestDebug,
    setModifyResult,
    updateModifyResultText,
    addMessage,
  } = useAIStore();

  /**
   * 发送 AI 请求
   */
  const sendRequest = useCallback(
    async (params: AIRequestParams): Promise<AIRequestResult> => {
      const {
        function: aiFunction,
        userInput,
        chatHistory = [],
        context,
        selectedText,
        enhancedContext,
        jailbreak = false,
      } = params;

      const isModify = isModifyFunction(aiFunction);

      // 验证参数
      if (isModify && !selectedText) {
        setError("请先选中需要修改的文本");
        return { success: false, error: "请先选中需要修改的文本" };
      }

      if (!isModify && !userInput?.trim() && chatHistory.length === 0) {
        return { success: false, error: "请输入内容" };
      }

      // 获取模型配置
      const modelConfig = getModelForFunction(aiFunction);
      if (!modelConfig) {
        const error = "未找到可用的 AI 服务商，请先配置 API Key";
        setError(error);
        return { success: false, error };
      }

      // 对于普通聊天，添加用户消息到历史
      if (!isModify && userInput?.trim()) {
        addMessage({ role: "user", content: userInput.trim() });
      }

      setLoading(true);
      setError(null);

      try {
        abortControllerRef.current = new AbortController();

        // 构建请求消息
        let requestMessages: ChatMessage[];
        if (isModify) {
          // 修改功能：如果有额外输入，作为用户指令
          requestMessages = userInput?.trim()
            ? [{ role: "user" as const, content: userInput.trim() }]
            : [];
        } else {
          // 普通聊天：使用聊天历史
          requestMessages = [...chatHistory];
          if (userInput?.trim()) {
            requestMessages.push({ role: "user", content: userInput.trim() });
          }
        }

        // 构建请求体
        const requestBody = {
          function: aiFunction,
          provider: {
            id: modelConfig.provider,
            apiKey: modelConfig.apiKey,
            baseUrl: modelConfig.baseUrl,
            model: modelConfig.model,
          },
          messages: requestMessages,
          jailbreak,
          context: context || undefined,
          selectedText: selectedText || undefined,
          enhancedContext: isModify ? enhancedContext : undefined,
          stream: true,
        };

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
        setStreaming(true);

        // 初始化状态
        if (isModify) {
          setModifyResult({
            originalText: selectedText!,
            modifiedText: "",
            functionType: aiFunction as "polish" | "expand" | "compress",
            isStreaming: true,
          });
        } else {
          setStreamingContent("");
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
                  if (isModify) {
                    updateModifyResultText(fullContent);
                  } else {
                    appendStreamingContent(parsed.content);
                  }
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }

        // 流式结束后处理
        if (isModify) {
          const result = parseModifyResult(fullContent);
          setModifyResult({
            originalText: selectedText!,
            modifiedText: result.result,
            explanation: result.explanation,
            functionType: aiFunction as "polish" | "expand" | "compress",
            isStreaming: false,
          });
        }

        setStreaming(false);
        return { success: true };
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
      setLoading,
      setStreaming,
      setStreamingContent,
      appendStreamingContent,
      setError,
      setLastRequestDebug,
      setModifyResult,
      updateModifyResultText,
      addMessage,
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

  return {
    sendRequest,
    stopRequest,
    isLoading,
    isStreaming,
  };
}
