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
 * AI 上下文标签组件
 * 显示用户添加的上下文，支持删除
 */
export function AIContextTags({ onAddClick }: AIContextTagsProps) {
  const { userContexts, removeUserContext } = useAIStore();

  if (userContexts.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <span className="text-xs text-muted-foreground">上下文:</span>
        <button
          onClick={onAddClick}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md",
            "text-xs text-muted-foreground",
            "border border-dashed border-border",
            "hover:border-violet-500/50 hover:text-violet-500",
            "transition-colors duration-150"
          )}
        >
          <Plus className="h-3 w-3" />
          <span>添加</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 overflow-x-auto">
      <span className="text-xs text-muted-foreground flex-shrink-0">上下文:</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {userContexts.map((item, index) => (
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
              onClick={() => removeUserContext(index)}
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
            "border border-dashed border-border",
            "hover:border-violet-500/50 hover:text-violet-500",
            "transition-colors duration-150"
          )}
          title="添加上下文"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
