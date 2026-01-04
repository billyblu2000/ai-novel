"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import { Bot, User, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * AI 聊天消息列表组件
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
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Bot className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">
          开始与 AI 助手对话
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          选择功能或直接输入问题
        </p>
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

        {/* 加载中状态 */}
        {isLoading && !isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bot className="h-5 w-5" />
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">AI 正在思考...</span>
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
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* 头像 */}
      <div
        className={cn(
          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* 消息内容 */}
      <div
        className={cn(
          "flex-1 max-w-[85%] rounded-lg px-3 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <div className="text-sm whitespace-pre-wrap break-words">
          {content}
          {/* 流式输出光标 */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
