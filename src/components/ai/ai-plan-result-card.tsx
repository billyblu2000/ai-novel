"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAIStore, type PlanResultState } from "@/lib/stores/ai-store";
import { useNodes } from "@/lib/hooks";
import {
  Check,
  Copy,
  Trash2,
  Loader2,
  FolderPlus,
  FileText,
  FolderOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AIPlanResultCardProps {
  result: PlanResultState;
  projectId: string;
}

/**
 * AI 规划结果卡片
 * 显示规划的子节点列表，支持应用/复制/删除
 */
export function AIPlanResultCard({ result, projectId }: AIPlanResultCardProps) {
  const { clearPlanResult, setCurrentFunction, clearUserContexts } = useAIStore();
  const { createNode, isCreating } = useNodes(projectId);
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const { children, explanation, isStreaming, targetNodeId } = result;

  // 应用规划结果：批量创建子节点
  const handleApply = useCallback(async () => {
    if (!targetNodeId || children.length === 0) {
      toast.error("无法应用：缺少目标节点或规划结果为空");
      return;
    }

    setApplying(true);
    try {
      // 按顺序创建子节点
      for (const child of children) {
        await createNode({
          projectId,
          parentId: targetNodeId,
          type: child.type,
          title: child.title,
          // 根据类型设置不同字段
          ...(child.type === "FILE"
            ? { summary: child.summary }
            : { outline: child.summary }),
        });
      }

      toast.success(`成功创建 ${children.length} 个子节点`);
      clearPlanResult();
      setCurrentFunction("chat");
      clearUserContexts();
    } catch (error) {
      console.error("Failed to apply plan result:", error);
      toast.error("应用失败，请重试");
    } finally {
      setApplying(false);
    }
  }, [
    targetNodeId,
    children,
    projectId,
    createNode,
    clearPlanResult,
    setCurrentFunction,
    clearUserContexts,
  ]);

  // 复制规划结果
  const handleCopy = useCallback(() => {
    const text = children
      .map(
        (child, index) =>
          `${index + 1}. ${child.title} (${child.type === "FOLDER" ? "章节" : "场景"})\n   ${child.summary}`
      )
      .join("\n\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  // 删除规划结果
  const handleDelete = useCallback(() => {
    clearPlanResult();
    setCurrentFunction("chat");
    clearUserContexts();
  }, [clearPlanResult, setCurrentFunction, clearUserContexts]);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        "shadow-sm",
        isStreaming && "border-violet-500/50"
      )}
    >
      {/* 标题栏 */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3",
          "bg-gradient-to-r from-violet-500/10 to-purple-500/10",
          "border-b border-border/50"
        )}
      >
        <div className="flex items-center gap-2">
          <FolderPlus className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium">AI 规划结果</span>
          {isStreaming && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-muted rounded"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {expanded && (
        <>
          {/* 规划说明 */}
          {explanation && (
            <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-b border-border/50">
              {explanation}
            </div>
          )}

          {/* 子节点列表 */}
          <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
            {children.length === 0 && isStreaming ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                正在生成规划...
              </div>
            ) : children.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                暂无规划结果
              </div>
            ) : (
              children.map((child, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg",
                    "bg-muted/30 border border-border/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                      child.type === "FOLDER"
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-green-500/10 text-green-500"
                    )}
                  >
                    {child.type === "FOLDER" ? (
                      <FolderOpen className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{child.title}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          child.type === "FOLDER"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-green-500/10 text-green-600"
                        )}
                      >
                        {child.type === "FOLDER" ? "章节" : "场景"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {child.summary || "无摘要"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 统计信息 */}
          {children.length > 0 && (
            <div className="px-4 py-2 border-t border-border/50 bg-muted/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  共 {children.length} 个子节点
                  {children.filter((c) => c.type === "FOLDER").length > 0 && (
                    <span className="ml-2">
                      ({children.filter((c) => c.type === "FOLDER").length} 章节,{" "}
                      {children.filter((c) => c.type === "FILE").length} 场景)
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border/50 bg-muted/10">
            <Button
              size="sm"
              onClick={handleApply}
              disabled={isStreaming || applying || isCreating || children.length === 0}
              className="gap-1.5"
            >
              {applying || isCreating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  应用中...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  应用
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              disabled={isStreaming || children.length === 0}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  复制
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
