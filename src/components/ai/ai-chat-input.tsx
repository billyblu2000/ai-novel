"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import { ArrowUp, Square, Loader2, ChevronDown, Lock, Unlock } from "lucide-react";
import { getModelForFunction } from "@/lib/ai/settings";
import type { AIFunction, AIContext } from "@/lib/ai/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// AI 功能定义
const AI_FUNCTIONS: {
  id: AIFunction;
  name: string;
  description: string;
  requiresSelection?: boolean;
}[] = [
  { id: "chat", name: "对话", description: "自由对话" },
  { id: "continue", name: "续写", description: "接续内容" },
  { id: "plan", name: "规划", description: "生成摘要" },
  { id: "summarize", name: "总结", description: "内容总结" },
  { id: "polish", name: "润色", description: "提升文笔", requiresSelection: true },
  { id: "expand", name: "扩写", description: "丰富细节", requiresSelection: true },
  { id: "compress", name: "缩写", description: "精简内容", requiresSelection: true },
];

/**
 * AI 聊天输入组件
 * ChatGPT 风格的现代设计
 */
export function AIChatInput() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    currentFunction,
    setCurrentFunction,
    selectedText,
    userContexts,
    currentProject,
    settings,
    toggleJailbreak,
    isLoading,
    isStreaming,
    addMessage,
    setLoading,
    setStreaming,
    setStreamingContent,
    appendStreamingContent,
    setError,
    debugMode,
    setLastRequestDebug,
  } = useAIStore();

  const currentFunctionInfo = AI_FUNCTIONS.find((f) => f.id === currentFunction);
  const isModifyEnabled = !!selectedText;

  // 发送消息
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading || isStreaming) return;

    const modelConfig = getModelForFunction(currentFunction);
    if (!modelConfig) {
      setError("未找到可用的 AI 服务商，请先配置 API Key");
      return;
    }

    addMessage({ role: "user", content: trimmedInput });
    setInput("");
    setLoading(true);
    setError(null);

    // 重置 textarea 高度
    if (textareaRef.current) {
      textareaRef.current.style.height = "32px";
    }

    try {
      abortControllerRef.current = new AbortController();

      // 构建上下文
      const context: AIContext = {
        project: currentProject || undefined,
        userContexts: userContexts,
        relatedEntities: [],
        previousSummaries: [],
      };

      // 从 store 获取聊天历史（已包含刚添加的用户消息）
      const requestMessages = [...useAIStore.getState().chatHistory];

      const requestBody = {
        function: currentFunction,
        provider: {
          id: modelConfig.provider,
          apiKey: modelConfig.apiKey,
          baseUrl: modelConfig.baseUrl,
          model: modelConfig.model,
        },
        messages: requestMessages,
        jailbreak: settings.jailbreakEnabled,
        context: currentProject || userContexts.length > 0 ? context : undefined,
        selectedText: selectedText || undefined,
        stream: true,
      };

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
      setStreamingContent("");

      const decoder = new TextDecoder();
      let buffer = "";

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
    userContexts,
    currentProject,
    selectedText,
    settings.jailbreakEnabled,
    debugMode,
    isLoading,
    isStreaming,
    addMessage,
    setLoading,
    setStreaming,
    setStreamingContent,
    appendStreamingContent,
    setError,
  ]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
  }, [setStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "32px";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl transition-all duration-200",
        "bg-muted/50 border border-border/50",
        "focus-within:border-violet-500/50 focus-within:bg-background",
        "focus-within:shadow-[0_0_0_2px_rgba(139,92,246,0.1)]",
        // 破限模式特效边框
        settings.jailbreakEnabled && [
          "border-transparent",
          "bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-400/10",
          "shadow-[0_0_0_1px_rgba(168,85,247,0.4)]",
        ]
      )}
    >
      {/* 输入区域 */}
      <div className="flex items-center gap-2 p-2">
        {/* 功能选择器 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1.5 px-2.5 h-8 rounded-xl",
                "text-xs font-medium",
                "bg-background/80 border border-border/50",
                "hover:bg-background hover:border-border",
                "transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              )}
            >
              <span className="text-muted-foreground">{currentFunctionInfo?.name}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {AI_FUNCTIONS.map((func) => {
              const disabled = func.requiresSelection && !isModifyEnabled;
              return (
                <DropdownMenuItem
                  key={func.id}
                  onClick={() => !disabled && setCurrentFunction(func.id)}
                  disabled={disabled}
                  className={cn(
                    "cursor-pointer",
                    currentFunction === func.id && "bg-accent"
                  )}
                >
                  <span>{func.name}</span>
                  {disabled && (
                    <span className="ml-auto text-[10px] text-muted-foreground">需选中</span>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => toggleJailbreak(!settings.jailbreakEnabled)}
              className={cn(
                "cursor-pointer",
                settings.jailbreakEnabled && "bg-pink-500/10 text-pink-600"
              )}
            >
              {settings.jailbreakEnabled ? (
                <Unlock className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              <span>无限制模式</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 文本输入 */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            settings.jailbreakEnabled
              ? "无限制模式：尽情发挥想象力..."
              : "输入消息..."
          }
          className={cn(
            "flex-1 bg-transparent border-0 resize-none overflow-hidden",
            "text-sm leading-8 placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-0",
            "h-8 max-h-[120px]"
          )}
          rows={1}
          disabled={isLoading}
        />

        {/* 发送/停止按钮 */}
        {isStreaming ? (
          <button
            onClick={handleStop}
            className={cn(
              "flex-shrink-0 h-8 w-8 rounded-xl",
              "bg-red-500 hover:bg-red-600",
              "flex items-center justify-center",
              "transition-colors duration-150"
            )}
            title="停止生成"
          >
            <Square className="h-3.5 w-3.5 text-white fill-white" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              "flex-shrink-0 h-8 w-8 rounded-xl",
              "flex items-center justify-center",
              "transition-all duration-150",
              input.trim() && !isLoading
                ? "bg-violet-500 hover:bg-violet-600 text-white"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            title="发送"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/60">
          Enter 发送 · Shift+Enter 换行
        </span>
        {settings.jailbreakEnabled && (
          <span className="text-[10px] text-pink-500/80">
            无限制模式
          </span>
        )}
      </div>
    </div>
  );
}
