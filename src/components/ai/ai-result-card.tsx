"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import {
  Check,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 修改结果卡片组件
 * 显示原文 vs 修改后的对比，支持应用、复制、删除操作
 */
interface AIResultCardProps {
  /** 原始文本 */
  originalText: string;
  /** 修改后的文本 */
  modifiedText: string;
  /** 修改说明 */
  explanation?: string;
  /** 功能类型 */
  functionType: "polish" | "expand" | "compress";
  /** 应用回调 - 替换编辑器中的选中内容 */
  onApply?: (text: string) => void;
  /** 删除回调 */
  onDismiss?: () => void;
  /** 是否正在流式输出 */
  isStreaming?: boolean;
}

const FUNCTION_LABELS: Record<string, string> = {
  polish: "润色",
  expand: "扩写",
  compress: "缩写",
};

export function AIResultCard({
  originalText,
  modifiedText,
  explanation,
  functionType,
  onApply,
  onDismiss,
  isStreaming,
}: AIResultCardProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  // 复制到剪贴板
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(modifiedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  }, [modifiedText]);

  // 应用修改
  const handleApply = useCallback(() => {
    if (onApply) {
      onApply(modifiedText);
      setApplied(true);
    }
  }, [modifiedText, onApply]);

  // 计算文本变化统计
  const originalLength = originalText.length;
  const modifiedLength = modifiedText.length;
  const lengthDiff = modifiedLength - originalLength;
  const lengthPercent = Math.round((lengthDiff / originalLength) * 100);

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-xs font-medium">
            {FUNCTION_LABELS[functionType]}结果
          </span>
          {isStreaming && (
            <span className="text-[10px] text-muted-foreground animate-pulse">
              生成中...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* 字数变化统计 */}
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded",
              lengthDiff > 0
                ? "bg-green-500/10 text-green-600"
                : lengthDiff < 0
                  ? "bg-orange-500/10 text-orange-600"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {lengthDiff > 0 ? "+" : ""}
            {lengthDiff} 字 ({lengthPercent > 0 ? "+" : ""}
            {lengthPercent}%)
          </span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-3 space-y-3">
        {/* 修改说明 */}
        {explanation && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <span className="font-medium">修改说明：</span>
            {explanation}
          </div>
        )}

        {/* 修改后的文本 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3 text-violet-500" />
            <span className="text-[10px] font-medium text-violet-600">
              修改后
            </span>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap bg-background/50 rounded-lg p-3 border border-border/30">
            {modifiedText}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 ml-0.5 bg-foreground animate-pulse align-middle" />
            )}
          </div>
        </div>

        {/* 原文（可折叠） */}
        <div className="space-y-1.5">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOriginal ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            <span>{showOriginal ? "收起原文" : "查看原文"}</span>
          </button>
          {showOriginal && (
            <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/50 rounded-lg p-3 text-muted-foreground border border-border/30">
              {originalText}
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-border/50 bg-muted/30">
        {/* 删除按钮 */}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            删除
          </Button>
        )}

        {/* 复制按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          disabled={isStreaming}
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
        {onApply && (
          <Button
            variant="default"
            size="sm"
            onClick={handleApply}
            disabled={isStreaming || applied}
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
              "应用修改"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 用于在聊天消息中显示的简化版结果卡片
 */
interface AIResultMessageProps {
  /** 原始文本 */
  originalText: string;
  /** 修改后的文本 */
  modifiedText: string;
  /** 修改说明 */
  explanation?: string;
  /** 功能类型 */
  functionType: "polish" | "expand" | "compress";
  /** 是否正在流式输出 */
  isStreaming?: boolean;
}

export function AIResultMessage({
  originalText,
  modifiedText,
  explanation,
  functionType,
  isStreaming,
}: AIResultMessageProps) {
  const { clearModifyResult } = useAIStore();

  // 应用修改 - 这里需要通过事件或回调通知编辑器
  const handleApply = useCallback(
    (text: string) => {
      // 触发全局事件，让编辑器监听并应用修改
      const event = new CustomEvent("ai-apply-modify", {
        detail: { text, originalText },
      });
      window.dispatchEvent(event);
    },
    [originalText]
  );

  // 删除结果
  const handleDismiss = useCallback(() => {
    clearModifyResult();
  }, [clearModifyResult]);

  return (
    <AIResultCard
      originalText={originalText}
      modifiedText={modifiedText}
      explanation={explanation}
      functionType={functionType}
      onApply={handleApply}
      onDismiss={handleDismiss}
      isStreaming={isStreaming}
    />
  );
}
