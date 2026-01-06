"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import { useAIRequest } from "@/lib/ai/hooks";
import {
  Check,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Wand2,
  Expand,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  SpecialResultMessage,
  ModifyFunctionType,
  ModifyResult,
  ModifyPayload,
} from "@/lib/ai/types";
import { getSpecialFunctionName, isSpecialRequestMessage } from "@/lib/ai/types";

interface AIModifyResultCardProps {
  message: SpecialResultMessage<ModifyFunctionType>;
}

const FUNCTION_ICONS: Record<ModifyFunctionType, typeof Wand2> = {
  polish: Wand2,
  expand: Expand,
  compress: Minimize2,
};

/**
 * 修改结果卡片组件
 * 显示原文 vs 修改后的对比，支持应用、复制、删除操作
 */
export function AIModifyResultCard({ message }: AIModifyResultCardProps) {
  const { functionType, result, applied, requestMessageId } = message;
  const { modifiedText, explanation } = result as ModifyResult;

  const { chatHistory } = useAIStore();
  const { markAsApplied } = useAIRequest();

  const [showOriginal, setShowOriginal] = useState(false);
  const [copied, setCopied] = useState(false);

  // 从请求消息中获取原始文本
  const requestMessage = chatHistory.find((m) => m.id === requestMessageId);
  const originalText =
    requestMessage && isSpecialRequestMessage(requestMessage)
      ? (requestMessage.payload as ModifyPayload).selectedText
      : "";

  const FunctionIcon = FUNCTION_ICONS[functionType];
  const functionName = getSpecialFunctionName(functionType);

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
    // 触发全局事件，让编辑器监听并应用修改
    const event = new CustomEvent("ai-apply-modify", {
      detail: { text: modifiedText, originalText },
    });
    window.dispatchEvent(event);
    markAsApplied(message.id);
  }, [modifiedText, originalText, message.id, markAsApplied]);

  // 计算文本变化统计
  const originalLength = originalText.length;
  const modifiedLength = modifiedText.length;
  const lengthDiff = modifiedLength - originalLength;
  const lengthPercent =
    originalLength > 0 ? Math.round((lengthDiff / originalLength) * 100) : 0;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/50">
        <div className="flex items-center gap-2">
          <FunctionIcon className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-xs font-medium">{functionName}结果</span>
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
          </div>
        </div>

        {/* 原文（可折叠） */}
        {originalText && (
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
        )}
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
            "应用修改"
          )}
        </Button>
      </div>
    </div>
  );
}
