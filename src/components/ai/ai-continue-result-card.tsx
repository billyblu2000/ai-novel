"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAIRequest } from "@/lib/ai/hooks";
import {
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  SpecialResultMessage,
  ContinueResult,
} from "@/lib/ai/types";
import { getSpecialFunctionName } from "@/lib/ai/types";

interface AIContinueResultCardProps {
  message: SpecialResultMessage<"continue">;
}

/**
 * 续写结果卡片组件
 * 显示续写内容，支持应用、复制操作
 */
export function AIContinueResultCard({ message }: AIContinueResultCardProps) {
  const { result, applied } = message;
  const { content } = result as ContinueResult;

  const { markAsApplied } = useAIRequest();

  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const functionName = getSpecialFunctionName("continue");

  // 复制到剪贴板
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  }, [content]);

  // 应用续写
  const handleApply = useCallback(() => {
    // 触发全局事件，让编辑器监听并在光标位置插入续写内容
    const event = new CustomEvent("ai-apply-continue", {
      detail: { text: content },
    });
    window.dispatchEvent(event);
    markAsApplied(message.id);
  }, [content, message.id, markAsApplied]);

  // 计算字数
  const wordCount = content.length;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/50">
        <div className="flex items-center gap-2">
          <PenLine className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-medium">{functionName}结果</span>
        </div>
        <div className="flex items-center gap-1">
          {/* 字数统计 */}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
            +{wordCount} 字
          </span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-3 space-y-3">
        {/* 续写内容 */}
        <div className="space-y-1.5">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPreview ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            <span className="font-medium text-emerald-600">
              {showPreview ? "收起预览" : "展开预览"}
            </span>
          </button>
          {showPreview && (
            <div className="text-sm leading-relaxed whitespace-pre-wrap bg-background/50 rounded-lg p-3 border border-border/30 max-h-[300px] overflow-y-auto">
              {content}
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-border/50 bg-muted/30">
        {/* 复制按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
              已复制
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1" />
              复制
            </>
          )}
        </Button>

        {/* 应用按钮 */}
        <Button
          variant="default"
          size="sm"
          onClick={handleApply}
          disabled={applied}
          className={cn(
            "h-7 px-3 text-xs",
            applied && "bg-green-500 hover:bg-green-500"
          )}
        >
          {applied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1" />
              已应用
            </>
          ) : (
            "插入到编辑器"
          )}
        </Button>
      </div>
    </div>
  );
}
