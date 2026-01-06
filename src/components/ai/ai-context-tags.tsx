"use client";

import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import { X, FileText, Scissors, User, Plus } from "lucide-react";
import type { UserContextItem } from "@/lib/ai/types";

interface AIContextTagsProps {
  onAddClick: () => void;
}

/**
 * 获取上下文项的图标
 */
function getContextIcon(item: UserContextItem) {
  switch (item.type) {
    case "node":
      return <FileText className="h-3 w-3" />;
    case "selection":
      return <Scissors className="h-3 w-3" />;
    case "entity":
      return <User className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
}

/**
 * 获取上下文项的显示文本
 */
function getContextLabel(item: UserContextItem): string {
  switch (item.type) {
    case "node":
      return item.title;
    case "selection":
      // 截取前20个字符
      const text = item.text.slice(0, 20);
      return text.length < item.text.length ? `${text}...` : text;
    case "entity":
      return item.name;
    default:
      return "未知";
  }
}

/**
 * 获取上下文项的类型标签
 */
function getContextTypeLabel(item: UserContextItem): string {
  switch (item.type) {
    case "node":
      return "节点";
    case "selection":
      return "选段";
    case "entity":
      return "实体";
    default:
      return "";
  }
}

/**
 * 获取上下文项的样式类
 */
function getContextColorClass(item: UserContextItem): string {
  switch (item.type) {
    case "node":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20";
    case "selection":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20";
    case "entity":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/**
 * AI 参考内容标签组件
 * 显示用户添加的临时上下文，支持删除
 * 位于输入框上方
 */
export function AIContextTags({ onAddClick }: AIContextTagsProps) {
  const { pendingContexts, removePendingContext } = useAIStore();

  // 无上下文时显示简洁的添加按钮
  if (pendingContexts.length === 0) {
    return (
      <div className="flex items-center">
        <button
          onClick={onAddClick}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md",
            "text-xs text-muted-foreground",
            "border border-dashed border-border/60",
            "hover:border-violet-500/50 hover:text-violet-500 hover:bg-violet-500/5",
            "transition-colors duration-150"
          )}
        >
          <Plus className="h-3 w-3" />
          <span>添加参考内容</span>
        </button>
      </div>
    );
  }

  // 有上下文时显示标签列表
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-xs text-muted-foreground flex-shrink-0">参考:</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {pendingContexts.map((item, index) => (
          <div
            key={index}
            className={cn(
              "group flex items-center gap-1 px-2 py-0.5 rounded-md",
              "text-xs border",
              "transition-colors duration-150",
              getContextColorClass(item)
            )}
            title={`${getContextTypeLabel(item)}: ${item.type === "selection" ? item.text : item.type === "node" ? item.title : item.type === "entity" ? item.name : ""}`}
          >
            {getContextIcon(item)}
            <span className="max-w-[100px] truncate">{getContextLabel(item)}</span>
            <button
              onClick={() => removePendingContext(index)}
              className="opacity-50 hover:opacity-100 transition-opacity"
              title="移除"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={onAddClick}
          className={cn(
            "flex items-center justify-center h-5 w-5 rounded",
            "text-muted-foreground",
            "border border-dashed border-border/60",
            "hover:border-violet-500/50 hover:text-violet-500",
            "transition-colors duration-150"
          )}
          title="添加参考内容"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 用于消息气泡中显示的上下文标签（只读，无删除按钮）
// ============================================================

interface MessageContextTagsProps {
  contexts: UserContextItem[];
  /** 
   * 变体：dark 用于黑底（用户文本消息），light 用于浅底（特殊请求卡片）
   * @default "dark"
   */
  variant?: "dark" | "light";
}

/**
 * 获取消息气泡中上下文项的样式类
 * dark: 用于黑底用户消息，使用更浅/更亮的颜色
 * light: 用于浅底特殊请求卡片，使用正常深色
 */
function getMessageContextColorClass(item: UserContextItem, variant: "dark" | "light"): string {
  if (variant === "light") {
    // 浅底场景：使用深色文字
    switch (item.type) {
      case "node":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "selection":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "entity":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      default:
        return "bg-muted text-muted-foreground border-border/50";
    }
  }
  // 黑底场景：使用浅色文字
  switch (item.type) {
    case "node":
      return "bg-blue-400/20 text-blue-200 border-blue-400/30";
    case "selection":
      return "bg-amber-400/20 text-amber-200 border-amber-400/30";
    case "entity":
      return "bg-emerald-400/20 text-emerald-200 border-emerald-400/30";
    default:
      return "bg-white/10 text-white/70 border-white/20";
  }
}

/**
 * 消息中的上下文标签（只读）
 * 用于在消息气泡中显示该消息添加了哪些参考内容
 */
export function MessageContextTags({ contexts, variant = "dark" }: MessageContextTagsProps) {
  if (!contexts || contexts.length === 0) return null;

  const isLight = variant === "light";

  return (
    <div className={cn(
      "flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t",
      isLight ? "border-border/30" : "border-white/20"
    )}>
      <span className={cn(
        "text-[10px]",
        isLight ? "text-muted-foreground" : "text-white/60"
      )}>参考:</span>
      {contexts.map((item, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded",
            "text-[10px] border",
            getMessageContextColorClass(item, variant)
          )}
          title={`${getContextTypeLabel(item)}: ${item.type === "selection" ? item.text : item.type === "node" ? item.title : item.type === "entity" ? item.name : ""}`}
        >
          {getContextIcon(item)}
          <span className="max-w-[80px] truncate">{getContextLabel(item)}</span>
        </div>
      ))}
    </div>
  );
}
