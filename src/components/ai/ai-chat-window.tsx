"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAIStore, initializeAIStore } from "@/lib/stores/ai-store";
import { Button } from "@/components/ui/button";
import { Bot, Minus, X } from "lucide-react";
import { AIChatMessages } from "./ai-chat-messages";
import { AIChatInput } from "./ai-chat-input";
import { AIFunctionSelect } from "./ai-function-select";

/**
 * AI 聊天浮窗组件
 * 支持收起/展开状态
 */
export function AIChatWindow() {
  const {
    isChatWindowOpen,
    hasUnreadMessage,
    toggleChatWindow,
    clearChatHistory,
    settings,
  } = useAIStore();

  // 初始化 AI Store
  useEffect(() => {
    initializeAIStore();
  }, []);

  // 检查是否有可用的 Provider
  const hasEnabledProvider = Object.values(settings.providers).some(
    (p) => p.enabled && p.apiKey
  );

  // 收起状态 - 悬浮按钮
  if (!isChatWindowOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => toggleChatWindow(true)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            "bg-primary hover:bg-primary/90",
            "transition-all duration-200 hover:scale-105",
            "relative"
          )}
          size="icon"
        >
          <Bot className="h-6 w-6" />
          {/* 脉冲动画 */}
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          {/* 未读消息红点 */}
          {hasUnreadMessage && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive border-2 border-background" />
          )}
        </Button>
      </div>
    );
  }

  // 展开状态 - 完整浮窗
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "w-[400px] h-[500px]",
        "bg-background border rounded-lg shadow-2xl",
        "flex flex-col",
        "animate-in slide-in-from-bottom-4 fade-in duration-200",
        // 破限模式边框
        settings.jailbreakEnabled &&
          "border-2 border-transparent bg-clip-padding",
        settings.jailbreakEnabled &&
          "before:absolute before:inset-0 before:-z-10 before:rounded-lg before:p-[2px] before:bg-gradient-to-r before:from-purple-500 before:to-pink-500"
      )}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium">AI 助手</span>
          {settings.jailbreakEnabled && (
            <span className="text-xs text-pink-500 font-medium">
              ⚠️ 破限模式
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => toggleChatWindow(false)}
            title="收起"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              clearChatHistory();
              toggleChatWindow(false);
            }}
            title="关闭并清空对话"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-hidden">
        {!hasEnabledProvider ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              请先配置 AI 服务商
            </p>
            <p className="text-sm text-muted-foreground">
              前往 设置 → AI 设置 添加 API Key
            </p>
          </div>
        ) : (
          <AIChatMessages />
        )}
      </div>

      {/* 功能选择器 */}
      {hasEnabledProvider && (
        <div className="px-4 py-2 border-t bg-muted/20">
          <AIFunctionSelect />
        </div>
      )}

      {/* 输入区域 */}
      {hasEnabledProvider && (
        <div className="px-4 py-3 border-t">
          <AIChatInput />
        </div>
      )}
    </div>
  );
}
