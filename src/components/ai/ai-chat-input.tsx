"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square, Loader2 } from "lucide-react";
import { getModelForFunction } from "@/lib/ai/settings";

/**
 * AI 聊天输入组件
 */
export function AIChatInput() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    currentFunction,
    settings,
    isLoading,
    isStreaming,
    addMessage,
    setLoading,
    setStreaming,
    setStreamingContent,
    appendStreamingContent,
    setError,
  } = useAIStore();

  // 发送消息
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading || isStreaming) return;

    // 获取模型配置
    const modelConfig = getModelForFunction(currentFunction);
    if (!modelConfig) {
      setError("未找到可用的 AI 服务商，请先配置 API Key");
      return;
    }

    // 添加用户消息
    addMessage({ role: "user", content: trimmedInput });
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // 创建 AbortController
      abortControllerRef.current = new AbortController();

      // 发送请求
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          function: currentFunction,
          provider: {
            id: modelConfig.provider,
            apiKey: modelConfig.apiKey,
            baseUrl: modelConfig.baseUrl,
            model: modelConfig.model,
          },
          messages: [
            ...useAIStore.getState().chatHistory,
            { role: "user", content: trimmedInput },
          ],
          jailbreak: settings.jailbreakEnabled,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "请求失败");
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      setLoading(false);
      setStreaming(true);
      setStreamingContent("");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 处理 SSE 格式
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                appendStreamingContent(parsed.content);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      setStreaming(false);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // 用户主动停止
        setStreaming(false);
        return;
      }
      setError((error as Error).message);
      setLoading(false);
      setStreaming(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    input,
    currentFunction,
    settings.jailbreakEnabled,
    isLoading,
    isStreaming,
    addMessage,
    setLoading,
    setStreaming,
    setStreamingContent,
    appendStreamingContent,
    setError,
  ]);

  // 停止生成
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
  }, [setStreaming]);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 自动调整高度
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // 自动调整高度
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex items-end gap-2">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={
          settings.jailbreakEnabled
            ? "破限模式：AI 将生成不受限制的内容..."
            : "输入消息... (Enter 发送, Shift+Enter 换行)"
        }
        className={cn(
          "flex-1 min-h-[40px] max-h-[120px] resize-none",
          "text-sm"
        )}
        rows={1}
        disabled={isLoading}
      />

      {isStreaming ? (
        <Button
          onClick={handleStop}
          variant="destructive"
          size="icon"
          className="h-10 w-10 flex-shrink-0"
          title="停止生成"
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          size="icon"
          className="h-10 w-10 flex-shrink-0"
          title="发送"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
