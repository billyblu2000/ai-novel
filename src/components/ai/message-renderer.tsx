"use client";

import { cn } from "@/lib/utils";
import { Sparkles, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type {
  ChatMessage,
  TextMessage,
  SpecialRequestMessage,
  SpecialResultMessage,
} from "@/lib/ai/types";
import {
  isTextMessage,
  isSpecialRequestMessage,
  isSpecialResultMessage,
  getSpecialFunctionName,
  isModifyFunctionType,
} from "@/lib/ai/types";
import { AIModifyResultCard } from "./ai-modify-result-card";
import { AIPlanResultCard } from "./ai-plan-result-card";
import { AIContinueResultCard } from "./ai-continue-result-card";
import { AISummarizeResultCard } from "./ai-summarize-result-card";
import { AISpecialRequestCard } from "./ai-special-request-card";
import { MessageContextTags } from "./ai-context-tags";

interface MessageRendererProps {
  message: ChatMessage;
  projectId?: string;
  isLastMessage?: boolean;
}

/**
 * 消息渲染器
 * 根据消息类型分发到不同的渲染组件
 */
export function MessageRenderer({
  message,
  projectId,
  isLastMessage,
}: MessageRendererProps) {
  if (isTextMessage(message)) {
    return <TextMessageBubble message={message} />;
  }

  if (isSpecialRequestMessage(message)) {
    return <SpecialRequestBubble message={message} />;
  }

  if (isSpecialResultMessage(message)) {
    return (
      <SpecialResultBubble
        message={message}
        projectId={projectId}
        isLastMessage={isLastMessage}
      />
    );
  }

  return null;
}

// ============================================================
// 文本消息气泡
// ============================================================

interface TextMessageBubbleProps {
  message: TextMessage;
}

function TextMessageBubble({ message }: TextMessageBubbleProps) {
  const isUser = message.role === "user";
  const hasContexts = isUser && message.userContexts && message.userContexts.length > 0;

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
        className={cn("flex-1 max-w-[85%]", isUser ? "text-right" : "text-left")}
      >
        <div
          className={cn(
            "inline-block rounded-2xl px-3.5 py-2.5 text-sm",
            isUser
              ? "bg-foreground text-background rounded-tr-md"
              : "bg-muted/70 text-foreground rounded-tl-md"
          )}
        >
          {isUser ? (
            <div>
              <div className="whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </div>
              {/* 显示参考内容标签 */}
              {hasContexts && (
                <MessageContextTags contexts={message.userContexts!} />
              )}
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-background/50 prose-pre:bg-background/50 prose-pre:p-2 prose-pre:rounded-lg">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 特殊请求消息气泡
// ============================================================

interface SpecialRequestBubbleProps {
  message: SpecialRequestMessage;
}

function SpecialRequestBubble({ message }: SpecialRequestBubbleProps) {
  return (
    <div className="flex gap-3 flex-row-reverse">
      {/* 头像 */}
      <div className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center bg-muted">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* 请求卡片 - 使用 flex justify-end 让卡片靠右，但卡片内部文本保持左对齐 */}
      <div className="flex-1 max-w-[85%] flex justify-end">
        <AISpecialRequestCard message={message} />
      </div>
    </div>
  );
}

// ============================================================
// 特殊结果消息气泡
// ============================================================

interface SpecialResultBubbleProps {
  message: SpecialResultMessage;
  projectId?: string;
  isLastMessage?: boolean;
}

function SpecialResultBubble({
  message,
  projectId,
  isLastMessage,
}: SpecialResultBubbleProps) {
  const { functionType, isStreaming, streamingContent } = message;

  return (
    <div className="flex items-start gap-3">
      {/* 头像 */}
      <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-foreground flex items-center justify-center">
        <Sparkles
          className={cn(
            "h-3.5 w-3.5 text-background",
            isStreaming && "animate-pulse"
          )}
        />
      </div>

      {/* 结果内容 */}
      <div className="flex-1">
        {/* 流式输出中显示原始内容 */}
        {isStreaming && streamingContent && (
          <div className="bg-muted/70 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm mb-2">
            <div className="text-xs text-muted-foreground mb-1">
              {getSpecialFunctionName(functionType)}中...
            </div>
            <div className="font-mono text-xs text-muted-foreground whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
              {streamingContent}
              <span className="inline-block w-0.5 h-4 ml-0.5 bg-foreground animate-pulse align-middle" />
            </div>
          </div>
        )}

        {/* 结果卡片 */}
        {!isStreaming && (
          <>
            {isModifyFunctionType(functionType) && (
              <AIModifyResultCard message={message as SpecialResultMessage<"polish" | "expand" | "compress">} />
            )}
            {functionType === "plan" && projectId && (
              <AIPlanResultCard
                message={message as SpecialResultMessage<"plan">}
                projectId={projectId}
              />
            )}
            {functionType === "continue" && (
              <AIContinueResultCard
                message={message as SpecialResultMessage<"continue">}
              />
            )}
            {functionType === "summarize" && (
              <AISummarizeResultCard
                message={message as SpecialResultMessage<"summarize">}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 流式输出中的 AI 消息（普通聊天）
// ============================================================

interface StreamingTextBubbleProps {
  content: string;
}

export function StreamingTextBubble({ content }: StreamingTextBubbleProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-foreground flex items-center justify-center">
        <Sparkles className="h-3.5 w-3.5 text-background" />
      </div>
      <div className="flex-1 max-w-[85%]">
        <div className="inline-block rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm bg-muted/70 text-foreground">
          <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
            <ReactMarkdown>{content}</ReactMarkdown>
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-foreground animate-pulse align-middle" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 加载中状态
// ============================================================

export function LoadingBubble() {
  return (
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
  );
}
