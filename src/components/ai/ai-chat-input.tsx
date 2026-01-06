"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import { useAIRequest } from "@/lib/ai/hooks";
import { ArrowUp, Square, Loader2, X } from "lucide-react";
import { SPECIAL_FUNCTION_NAMES } from "@/lib/ai/types";

/**
 * AI 聊天输入组件
 * 支持普通聊天和特殊功能（通过 tag 显示）
 */
export function AIChatInput() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    settings,
    consumePendingContexts,
    pendingSpecialFunction,
    clearPendingSpecialFunction,
  } = useAIStore();
  const { sendRequest, stopRequest, isLoading, isStreaming } = useAIRequest();

  // 发送消息
  const handleSend = useCallback(async () => {
    // 有特殊功能时，即使输入为空也可以发送
    const trimmedInput = input.trim();
    if (!pendingSpecialFunction && !trimmedInput) return;
    if (isLoading || isStreaming) return;

    // 立即清空输入
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "32px";
    }

    // 获取并清空临时上下文
    const contexts = consumePendingContexts();

    if (pendingSpecialFunction) {
      // 发送特殊功能请求
      const { functionType, payload, userContexts } = pendingSpecialFunction;
      
      // 合并上下文
      const mergedContexts = [
        ...(userContexts || []),
        ...(contexts || []),
      ];

      // 清空待发送的特殊功能
      clearPendingSpecialFunction();

      await sendRequest({
        type: "special",
        functionType,
        payload,
        userContexts: mergedContexts.length > 0 ? mergedContexts : undefined,
        userInstruction: trimmedInput || undefined,
      });
    } else {
      // 发送普通聊天请求
      await sendRequest({
        type: "chat",
        userInput: trimmedInput,
        userContexts: contexts.length > 0 ? contexts : undefined,
      });
    }
  }, [
    input,
    isLoading,
    isStreaming,
    pendingSpecialFunction,
    sendRequest,
    consumePendingContexts,
    clearPendingSpecialFunction,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter 发送
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Backspace 删除 tag（当输入框为空且光标在最前面时）
    if (e.key === "Backspace" && pendingSpecialFunction) {
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart === 0 && textarea.selectionEnd === 0 && input === "") {
        e.preventDefault();
        clearPendingSpecialFunction();
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "32px";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  // 点击 tag 上的 X 删除
  const handleRemoveTag = useCallback(() => {
    clearPendingSpecialFunction();
    // 聚焦输入框
    textareaRef.current?.focus();
  }, [clearPendingSpecialFunction]);

  // 占位符文本
  const getPlaceholder = () => {
    if (pendingSpecialFunction) {
      return "可选：输入额外要求...";
    }
    if (settings.jailbreakEnabled) {
      return "无限制模式：尽情发挥想象力...";
    }
    return "输入消息...";
  };

  // 有特殊功能时，即使输入为空也可以发送
  const canSend = (!!input.trim() || !!pendingSpecialFunction) && !isLoading;

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
        {/* 特殊功能 Tag */}
        {pendingSpecialFunction && (
          <div
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5",
              "px-2.5 py-1 rounded-full",
              "bg-violet-500/15 text-violet-600 dark:text-violet-400",
              "border border-violet-500/30",
              "text-xs font-medium",
              "animate-in fade-in slide-in-from-left-2 duration-200"
            )}
          >
            <span className="text-violet-500 font-semibold">
              {SPECIAL_FUNCTION_NAMES[pendingSpecialFunction.functionType]}
            </span>
            <span className="text-muted-foreground">:</span>
            <span className="max-w-[120px] truncate">
              {pendingSpecialFunction.displayText}
            </span>
            <button
              onClick={handleRemoveTag}
              className="ml-0.5 p-0.5 rounded-full hover:bg-violet-500/20 transition-colors"
              title="取消"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* 文本输入 */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          className={cn(
            "flex-1 bg-transparent border-0 resize-none overflow-hidden",
            "text-sm leading-8 placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-0",
            "h-8 max-h-[120px]",
            "pl-2"
          )}
          rows={1}
          disabled={isLoading}
        />

        {/* 发送/停止按钮 */}
        {isStreaming ? (
          <button
            onClick={stopRequest}
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
            disabled={!canSend}
            className={cn(
              "flex-shrink-0 h-8 w-8 rounded-xl",
              "flex items-center justify-center",
              "transition-all duration-150",
              canSend
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
          {pendingSpecialFunction
            ? "Enter 发送 · Backspace 取消功能"
            : "Enter 发送 · Shift+Enter 换行"}
        </span>
        <div className="flex items-center gap-2">
          {settings.jailbreakEnabled && (
            <span className="text-[10px] text-pink-500/80">无限制模式</span>
          )}
        </div>
      </div>
    </div>
  );
}
