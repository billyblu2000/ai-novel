"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAIStore, initializeAIStore } from "@/lib/stores/ai-store";
import { Button } from "@/components/ui/button";
import { Sparkles, Minus, X, Settings } from "lucide-react";
import { AIChatMessages } from "./ai-chat-messages";
import { AIChatInput } from "./ai-chat-input";
import Link from "next/link";

/**
 * AI 聊天浮窗组件
 * 现代简约风格，参考 ChatGPT 设计
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
        <button
          onClick={() => toggleChatWindow(true)}
          className={cn(
            "group relative h-14 w-14 rounded-full",
            "bg-gradient-to-br from-violet-500 to-purple-600",
            "shadow-lg shadow-purple-500/25",
            "transition-all duration-300 ease-out",
            "hover:scale-110 hover:shadow-xl hover:shadow-purple-500/30",
            "active:scale-95"
          )}
        >
          <Sparkles className="h-6 w-6 text-white mx-auto" />
          {/* 光晕效果 */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md -z-10" />
          {/* 未读消息红点 */}
          {hasUnreadMessage && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-background animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  // 展开状态 - 完整浮窗
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "w-[420px] h-[540px]",
        "flex flex-col",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        "rounded-2xl overflow-hidden",
        // 破限模式特效边框
        settings.jailbreakEnabled
          ? "p-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400"
          : "shadow-2xl shadow-black/20"
      )}
    >
      {/* 内容容器 */}
      <div
        className={cn(
          "flex flex-col flex-1 bg-background overflow-hidden",
          settings.jailbreakEnabled ? "rounded-[14px]" : "rounded-2xl border border-border/50"
        )}
      >
        {/* 标题栏 - 毛玻璃效果 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/50 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-foreground">
              <Sparkles className="h-4 w-4 text-background" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight">AI 写作助手</span>
              {settings.jailbreakEnabled && (
                <span className="text-[10px] text-pink-500 font-medium leading-tight">
                  无限制模式已开启
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => toggleChatWindow(false)}
              title="收起"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
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
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-1">
                开始使用 AI 助手
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                请先配置 AI 服务商以启用功能
              </p>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href="/settings?tab=ai">
                  <Settings className="h-4 w-4" />
                  前往设置
                </Link>
              </Button>
            </div>
          ) : (
            <AIChatMessages />
          )}
        </div>

        {/* 输入区域 */}
        {hasEnabledProvider && (
          <div className="p-3 border-t border-border/50 bg-muted/30">
            <AIChatInput />
          </div>
        )}
      </div>
    </div>
  );
}
