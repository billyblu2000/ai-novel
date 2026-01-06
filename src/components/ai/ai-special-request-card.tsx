"use client";

import { cn } from "@/lib/utils";
import type { SpecialRequestMessage, ModifyPayload, PlanPayload } from "@/lib/ai/types";
import {
  getSpecialFunctionName,
  isModifyFunctionType,
} from "@/lib/ai/types";
import {
  Wand2,
  Expand,
  Minimize2,
  FolderTree,
  PenLine,
  FileText,
} from "lucide-react";
import { MessageContextTags } from "./ai-context-tags";

interface AISpecialRequestCardProps {
  message: SpecialRequestMessage;
}

/**
 * 特殊请求卡片
 * 显示用户触发的特殊功能请求
 */
export function AISpecialRequestCard({ message }: AISpecialRequestCardProps) {
  const { functionType, payload, userInstruction, userContexts } = message;
  const functionName = getSpecialFunctionName(functionType);

  // 获取功能图标
  const FunctionIcon = getFunctionIcon(functionType);

  // 获取功能颜色
  const colorClass = getFunctionColorClass(functionType);

  // 是否有参考内容
  const hasContexts = userContexts && userContexts.length > 0;

  return (
    <div
      className={cn(
        "inline-block rounded-2xl rounded-tr-md overflow-hidden",
        "border border-border/50 bg-muted/30"
      )}
    >
      {/* 头部 */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          "border-b border-border/50",
          colorClass
        )}
      >
        <FunctionIcon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{functionName}</span>
      </div>

      {/* 内容预览 */}
      <div className="px-3 py-2 space-y-2">
        {/* 修改功能：显示选中文本预览 */}
        {isModifyFunctionType(functionType) && (
          <ModifyPayloadPreview payload={payload as ModifyPayload} />
        )}

        {/* 规划功能：显示节点信息 */}
        {functionType === "plan" && (
          <PlanPayloadPreview payload={payload as PlanPayload} />
        )}

        {/* 用户额外指令 */}
        {userInstruction && (
          <div className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-2">
            <span className="text-foreground/70">额外要求：</span>
            {userInstruction}
          </div>
        )}

        {/* 参考内容标签 */}
        {hasContexts && (
          <MessageContextTags contexts={userContexts} variant="light" />
        )}
      </div>
    </div>
  );
}

// ============================================================
// 修改功能 Payload 预览
// ============================================================

function ModifyPayloadPreview({ payload }: { payload: ModifyPayload }) {
  const { selectedText } = payload;
  const preview =
    selectedText.length > 100
      ? selectedText.slice(0, 100) + "..."
      : selectedText;

  return (
    <div className="text-xs">
      <div className="text-muted-foreground mb-1">选中文本：</div>
      <div className="bg-background/50 rounded px-2 py-1.5 text-foreground/80 line-clamp-3">
        {preview}
      </div>
    </div>
  );
}

// ============================================================
// 规划功能 Payload 预览
// ============================================================

function PlanPayloadPreview({ payload }: { payload: PlanPayload }) {
  const { nodeName, existingChildren } = payload;

  return (
    <div className="text-xs space-y-1">
      <div className="flex items-center gap-1.5">
        <FolderTree className="h-3 w-3 text-muted-foreground" />
        <span className="text-foreground/80">{nodeName}</span>
      </div>
      {existingChildren.length > 0 && (
        <div className="text-muted-foreground">
          已有 {existingChildren.length} 个子节点
        </div>
      )}
    </div>
  );
}

// ============================================================
// 工具函数
// ============================================================

function getFunctionIcon(functionType: string) {
  switch (functionType) {
    case "polish":
      return Wand2;
    case "expand":
      return Expand;
    case "compress":
      return Minimize2;
    case "plan":
      return FolderTree;
    case "continue":
      return PenLine;
    case "summarize":
      return FileText;
    default:
      return Wand2;
  }
}

function getFunctionColorClass(functionType: string): string {
  switch (functionType) {
    case "polish":
      return "bg-violet-500/10 text-violet-600";
    case "expand":
      return "bg-blue-500/10 text-blue-600";
    case "compress":
      return "bg-orange-500/10 text-orange-600";
    case "plan":
      return "bg-emerald-500/10 text-emerald-600";
    case "continue":
      return "bg-cyan-500/10 text-cyan-600";
    case "summarize":
      return "bg-amber-500/10 text-amber-600";
    default:
      return "bg-muted text-muted-foreground";
  }
}
