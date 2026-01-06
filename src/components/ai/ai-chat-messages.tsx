"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import { Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageRenderer,
  StreamingTextBubble,
  LoadingBubble,
} from "./message-renderer";
import { isTextMessage } from "@/lib/ai/types";

interface AIChatMessagesProps {
  projectId?: string;
}

/**
 * AI 聊天消息列表组件
 * 统一消息流架构
 */
export function AIChatMessages({ projectId }: AIChatMessagesProps) {
  const {
    chatHistory,
    isStreaming,
    isLoading,
    streamingMessageId,
    streamingChatContent,
  } = useAIStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isStreaming, isLoading]);

  // 计算是否需要显示流式输出（普通聊天）
  // 如果最后一条消息是用户文本消息，且正在流式输出，说明是普通聊天
  const lastMessage = chatHistory[chatHistory.length - 1];
  const isStreamingChat =
    isStreaming &&
    !streamingMessageId &&
    lastMessage &&
    isTextMessage(lastMessage) &&
    lastMessage.role === "user";

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
              直接输入问题，或通过右键菜单使用特殊功能
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {["讨论剧情", "分析角色", "写作建议"].map((hint) => (
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
        {/* 渲染所有消息 */}
        {chatHistory.map((message, index) => (
          <MessageRenderer
            key={message.id}
            message={message}
            projectId={projectId}
            isLastMessage={index === chatHistory.length - 1}
          />
        ))}

        {/* 普通聊天的流式输出（AI 回复还未添加到历史） */}
        {isStreamingChat && streamingChatContent && (
          <StreamingTextBubble content={streamingChatContent} />
        )}

        {/* 加载中状态 */}
        {isLoading && <LoadingBubble />}

        {/* 用于滚动到底部的锚点 */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
