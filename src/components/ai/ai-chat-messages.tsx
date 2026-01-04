"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import { Sparkles, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * AI 聊天消息列表组件
 * ChatGPT 风格的现代设计
 */
export function AIChatMessages() {
  const { chatHistory, isStreaming, streamingContent, isLoading } = useAIStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, streamingContent]);

  // 空状态
  if (chatHistory.length === 0 && !isStreaming && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="space-y-4">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-muted flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">有什么可以帮您？</p>
            <p className="text-xs text-muted-foreground">
              选择功能或直接输入问题
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {["续写故事", "润色文字", "生成大纲"].map((hint) => (
              <span
                key={hint}
                className="px-3 py-1.5 text-xs bg-muted/50 text-muted-foreground rounded-full border border-border/50"
              >
                {hint}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="p-4 space-y-4">
        {/* 历史消息 */}
        {chatHistory.map((message, index) => (
          <MessageBubble
            key={index}
            role={message.role}
            content={message.content}
          />
        ))}

        {/* 流式输出中的消息 */}
        {isStreaming && streamingContent && (
          <MessageBubble
            role="assistant"
            content={streamingContent}
            isStreaming
          />
        )}

        {/* 加载中状态 - AI思考动画 */}
        {/* 显示条件：正在加载 或 (正在流式输出但内容为空) */}
        {(isLoading || (isStreaming && !streamingContent)) && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-foreground flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-background animate-pulse" />
            </div>
            <div className="bg-muted/70 rounded-2xl rounded-tl-md px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">思考中</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 用于滚动到底部的锚点 */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

/**
 * 消息气泡组件
 */
interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
}

function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";

  // 不显示 system 消息
  if (role === "system") return null;

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* 头像 */}
      <div
        className={cn(
          "flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center",
          isUser ? "bg-muted" : "bg-foreground"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-background" />
        )}
      </div>

      {/* 消息内容 */}
      <div
        className={cn(
          "flex-1 max-w-[85%]",
          isUser ? "text-right" : "text-left"
        )}
      >
        <div
          className={cn(
            "inline-block rounded-2xl px-3.5 py-2.5 text-sm",
            isUser
              ? "bg-foreground text-background rounded-tr-md"
              : "bg-muted/70 text-foreground rounded-tl-md"
          )}
        >
          <div className="whitespace-pre-wrap break-words leading-relaxed">
            {content}
            {/* 流式输出光标 */}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 ml-0.5 bg-foreground animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
