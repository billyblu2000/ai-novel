"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import { useAIRequest } from "@/lib/ai/hooks";
import { ArrowUp, Square, Loader2, ChevronDown, Lock, Unlock, Sparkles } from "lucide-react";
import { AI_FUNCTIONS, isModifyFunction } from "@/lib/ai/types";
import type { AIContext } from "@/lib/ai/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 下拉菜单中可选的功能
// 只显示"对话"，修改类功能只能通过右键菜单进入，生成类功能只能通过特定按钮进入
const SELECTABLE_FUNCTIONS = Object.values(AI_FUNCTIONS).filter(
  (f) => f.id === "chat"
);

/**
 * AI 聊天输入组件
 * ChatGPT 风格的现代设计
 */
export function AIChatInput() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    currentFunction,
    setCurrentFunction,
    selectedText,
    userContexts,
    currentProject,
    settings,
    toggleJailbreak,
    chatHistory,
    modifyEnhancedContext,
    contextEnhancementEnabled,
    toggleContextEnhancement,
    planContext,
    planTargetNodeId,
  } = useAIStore();

  const { sendRequest, stopRequest, isLoading, isStreaming } = useAIRequest();

  const currentFunctionMeta = AI_FUNCTIONS[currentFunction];
  const isModify = isModifyFunction(currentFunction);
  const isPlan = currentFunction === "plan";

  // 发送消息
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();

    // 普通聊天需要输入，修改功能需要选中文本，规划功能需要规划上下文
    if (!isModify && !isPlan && !trimmedInput) return;
    if (isPlan && !planContext) return;
    if (isLoading || isStreaming) return;

    // 构建上下文
    const context: AIContext = {
      project: currentProject || undefined,
      userContexts: userContexts,
      relatedEntities: [],
      previousSummaries: [],
    };

    // 获取目标节点 ID（规划功能使用）
    const targetNodeId = isPlan ? planTargetNodeId || undefined : undefined;

    // 发送请求
    await sendRequest({
      function: currentFunction,
      userInput: trimmedInput || undefined,
      chatHistory: isModify || isPlan ? [] : chatHistory,
      context: currentProject || userContexts.length > 0 ? context : undefined,
      selectedText: selectedText || undefined,
      enhancedContext: isModify ? modifyEnhancedContext || undefined : undefined,
      planContext: isPlan ? planContext || undefined : undefined,
      targetNodeId,
      jailbreak: settings.jailbreakEnabled,
    });

    // 清空输入
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "32px";
    }
  }, [
    input,
    currentFunction,
    userContexts,
    currentProject,
    selectedText,
    chatHistory,
    modifyEnhancedContext,
    planContext,
    planTargetNodeId,
    settings.jailbreakEnabled,
    isLoading,
    isStreaming,
    isModify,
    isPlan,
    sendRequest,
  ]);

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

  // 占位符文本
  const getPlaceholder = () => {
    if (settings.jailbreakEnabled) {
      return "无限制模式：尽情发挥想象力...";
    }
    if (isModify) {
      return "可选：输入额外的修改要求...";
    }
    if (isPlan) {
      return "可选：输入额外的规划要求...";
    }
    return "输入消息...";
  };

  // 发送按钮是否可用
  const canSend = () => {
    if (isLoading) return false;
    if (isModify) {
      // 修改功能：有选中文本即可发送
      return !!selectedText;
    }
    if (isPlan) {
      // 规划功能：有规划上下文即可发送
      return !!planContext;
    }
    // 普通聊天：需要输入内容
    return !!input.trim();
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
              <span className="text-muted-foreground">{currentFunctionMeta?.name}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {SELECTABLE_FUNCTIONS.map((func) => (
              <DropdownMenuItem
                key={func.id}
                onClick={() => setCurrentFunction(func.id)}
                className={cn(
                  "cursor-pointer",
                  currentFunction === func.id && "bg-accent"
                )}
              >
                <span>{func.name}</span>
              </DropdownMenuItem>
            ))}
            {/* 如果当前是修改功能，显示一个分隔和当前功能（不可点击切换） */}
            {isModify && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="opacity-70">
                  <span>{currentFunctionMeta?.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">右键选中</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => toggleContextEnhancement()}
                  className={cn(
                    "cursor-pointer",
                    contextEnhancementEnabled && "bg-blue-500/10 text-blue-600"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>上下文增强</span>
                  {contextEnhancementEnabled && (
                    <span className="ml-auto text-[10px]">✓</span>
                  )}
                </DropdownMenuItem>
              </>
            )}
            {/* 如果当前是规划功能，显示一个分隔和当前功能（不可点击切换） */}
            {isPlan && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="opacity-70">
                  <span>{currentFunctionMeta?.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">文件夹按钮</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => toggleContextEnhancement()}
                  className={cn(
                    "cursor-pointer",
                    contextEnhancementEnabled && "bg-blue-500/10 text-blue-600"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>上下文增强</span>
                  {contextEnhancementEnabled && (
                    <span className="ml-auto text-[10px]">✓</span>
                  )}
                </DropdownMenuItem>
              </>
            )}
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
          placeholder={getPlaceholder()}
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
            disabled={!canSend()}
            className={cn(
              "flex-shrink-0 h-8 w-8 rounded-xl",
              "flex items-center justify-center",
              "transition-all duration-150",
              canSend()
                ? "bg-violet-500 hover:bg-violet-600 text-white"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            title={isModify ? "开始处理" : "发送"}
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
          {isModify ? "Enter 开始处理" : "Enter 发送 · Shift+Enter 换行"}
        </span>
        <div className="flex items-center gap-2">
          {isModify && contextEnhancementEnabled && (
            <span className="text-[10px] text-blue-500/80">
              上下文增强
            </span>
          )}
          {settings.jailbreakEnabled && (
            <span className="text-[10px] text-pink-500/80">
              无限制模式
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
