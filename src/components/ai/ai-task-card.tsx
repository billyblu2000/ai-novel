"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  useAIStore,
  isModifyTask,
  isPlanTask,
  getModifyTypeName,
} from "@/lib/stores/ai-store";
import type { AITask, ModifyTask, PlanTask, PlannedChild } from "@/lib/stores/ai-store";
import { useNodes, getSiblings, calculateNewOrder } from "@/lib/hooks";
import {
  Check,
  Copy,
  Trash2,
  Loader2,
  Wand2,
  FolderPlus,
  FileText,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  X,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AITaskCardProps {
  task: AITask;
  projectId?: string;
  /** 是否为当前活跃任务 */
  isActive?: boolean;
}

/**
 * AI 任务卡片组件
 * 统一展示修改任务和规划任务
 */
export function AITaskCard({ task, projectId, isActive = false }: AITaskCardProps) {
  if (isModifyTask(task)) {
    return <ModifyTaskCard task={task} isActive={isActive} />;
  }
  if (isPlanTask(task)) {
    return <PlanTaskCard task={task} projectId={projectId} isActive={isActive} />;
  }
  return null;
}

/**
 * 修改任务卡片
 */
function ModifyTaskCard({ task, isActive }: { task: ModifyTask; isActive: boolean }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const { cancelTask, applyTask } = useAIStore();

  const { modifyType, selectedText, status, resultText, resultExplanation } = task;
  const isProcessing = status === "processing";
  const isCompleted = status === "completed";
  const isApplied = status === "applied";
  const isCancelled = status === "cancelled";
  const isPending = status === "pending";

  // 处理应用修改
  const handleApply = useCallback(() => {
    if (!resultText) return;
    // 触发全局事件，让编辑器监听并应用修改
    const event = new CustomEvent("ai-apply-modify", {
      detail: { text: resultText, originalText: selectedText },
    });
    window.dispatchEvent(event);
    applyTask();
    toast.success("已应用修改");
  }, [resultText, selectedText, applyTask]);

  // 复制结果
  const handleCopy = useCallback(() => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  }, [resultText]);

  // 取消任务
  const handleCancel = useCallback(() => {
    cancelTask();
  }, [cancelTask]);

  // 获取状态显示
  const getStatusDisplay = () => {
    if (isCancelled) return { text: "已取消", color: "text-muted-foreground" };
    if (isApplied) return { text: "已应用", color: "text-green-600" };
    if (isCompleted) return { text: "已完成", color: "text-blue-600" };
    if (isProcessing) return { text: "处理中...", color: "text-violet-600" };
    return { text: "待处理", color: "text-yellow-600" };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        "shadow-sm",
        isActive && isProcessing && "border-violet-500/50",
        isCancelled && "opacity-60"
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
          <Wand2 className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium">{getModifyTypeName(modifyType)}任务</span>
          <span className={cn("text-xs", statusDisplay.color)}>
            {statusDisplay.text}
          </span>
          {isProcessing && (
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
          {/* 原文预览 */}
          <div className="px-4 py-3 border-b border-border/50">
            <div className="text-xs text-muted-foreground mb-1">选中文本</div>
            <div className="text-sm bg-muted/30 rounded-lg p-2 max-h-[80px] overflow-y-auto">
              {selectedText.length > 200
                ? selectedText.slice(0, 200) + "..."
                : selectedText}
            </div>
          </div>

          {/* 结果区域 */}
          {(resultText || isProcessing) && (
            <div className="px-4 py-3 border-b border-border/50">
              <div className="text-xs text-muted-foreground mb-1">
                {isProcessing ? "生成中..." : "修改结果"}
              </div>
              <div className="text-sm bg-green-500/5 border border-green-500/20 rounded-lg p-2 max-h-[150px] overflow-y-auto">
                {resultText || (
                  <span className="text-muted-foreground">等待生成...</span>
                )}
                {isProcessing && (
                  <span className="inline-block w-0.5 h-4 ml-0.5 bg-foreground animate-pulse align-middle" />
                )}
              </div>
              {resultExplanation && (
                <div className="text-xs text-muted-foreground mt-2 italic">
                  {resultExplanation}
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          {!isCancelled && (
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/10">
              {isCompleted && (
                <>
                  <Button
                    size="sm"
                    onClick={handleApply}
                    disabled={!resultText}
                    className="gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    应用
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    disabled={!resultText}
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
                </>
              )}
              {isApplied && (
                <span className="text-sm text-green-600 flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  已应用到编辑器
                </span>
              )}
              {(isPending || isProcessing) && isActive && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                  取消
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * 规划任务卡片
 */
function PlanTaskCard({
  task,
  projectId,
  isActive,
}: {
  task: PlanTask;
  projectId?: string;
  isActive: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [applying, setApplying] = useState(false);
  const { cancelTask, applyTask } = useAIStore();
  const { nodes, createNodeAsync, isCreating } = useNodes(projectId || "");

  const {
    targetNodeTitle,
    targetNodeId,
    status,
    resultChildren,
    resultExplanation,
    context,
  } = task;
  const isProcessing = status === "processing";
  const isCompleted = status === "completed";
  const isApplied = status === "applied";
  const isCancelled = status === "cancelled";
  const isPending = status === "pending";

  const children = resultChildren || [];

  // 应用规划结果：批量创建子节点
  const handleApply = useCallback(async () => {
    if (!targetNodeId || children.length === 0 || !projectId) {
      toast.error("无法应用：缺少目标节点或规划结果为空");
      return;
    }

    setApplying(true);
    try {
      // 获取目标节点下已有的子节点
      const existingSiblings = getSiblings(nodes, targetNodeId);
      const existingChildTitles = new Set(
        existingSiblings.map((n) => n.title.trim().toLowerCase())
      );

      let createdCount = 0;
      let skippedCount = 0;
      let currentSiblings = [...existingSiblings];

      // 按顺序创建子节点
      for (const child of children) {
        // 检查是否已存在同名节点
        if (existingChildTitles.has(child.title.trim().toLowerCase())) {
          skippedCount++;
          continue;
        }

        // 计算新节点的 order
        const order = calculateNewOrder(currentSiblings, currentSiblings.length);

        await createNodeAsync({
          projectId,
          parentId: targetNodeId,
          type: child.type,
          title: child.title,
          order,
          outline: child.type === "FOLDER" ? child.summary : undefined,
          summary: child.type === "FILE" ? child.summary : undefined,
        });

        currentSiblings.push({
          id: `temp-${Date.now()}-${createdCount}`,
          order,
        } as any);

        createdCount++;
      }

      if (skippedCount > 0) {
        toast.success(
          `成功创建 ${createdCount} 个子节点，跳过 ${skippedCount} 个已存在的节点`
        );
      } else {
        toast.success(`成功创建 ${createdCount} 个子节点`);
      }

      applyTask();
    } catch (error) {
      console.error("Failed to apply plan result:", error);
      toast.error("应用失败，请重试");
    } finally {
      setApplying(false);
    }
  }, [targetNodeId, children, projectId, nodes, createNodeAsync, applyTask]);

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

  // 取消任务
  const handleCancel = useCallback(() => {
    cancelTask();
  }, [cancelTask]);

  // 获取状态显示
  const getStatusDisplay = () => {
    if (isCancelled) return { text: "已取消", color: "text-muted-foreground" };
    if (isApplied) return { text: "已应用", color: "text-green-600" };
    if (isCompleted) return { text: "已完成", color: "text-blue-600" };
    if (isProcessing) return { text: "规划中...", color: "text-violet-600" };
    return { text: "待处理", color: "text-yellow-600" };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        "shadow-sm",
        isActive && isProcessing && "border-violet-500/50",
        isCancelled && "opacity-60"
      )}
    >
      {/* 标题栏 */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3",
          "bg-gradient-to-r from-blue-500/10 to-cyan-500/10",
          "border-b border-border/50"
        )}
      >
        <div className="flex items-center gap-2">
          <FolderPlus className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">规划任务</span>
          <span className={cn("text-xs", statusDisplay.color)}>
            {statusDisplay.text}
          </span>
          {isProcessing && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
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
          {/* 目标信息 */}
          <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-b border-border/50">
            <span>目标: {targetNodeTitle}</span>
            {context.currentOutline && (
              <span className="ml-2">
                · 大纲: {context.currentOutline.slice(0, 50)}
                {context.currentOutline.length > 50 ? "..." : ""}
              </span>
            )}
          </div>

          {/* 规划说明 */}
          {resultExplanation && (
            <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/50">
              {resultExplanation}
            </div>
          )}

          {/* 子节点列表 */}
          <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
            {children.length === 0 && isProcessing ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                正在生成规划...
              </div>
            ) : children.length === 0 && !isProcessing ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {isPending ? "点击发送开始规划" : "暂无规划结果"}
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
          {!isCancelled && (
            <div className="flex items-center gap-2 px-4 py-3 border-t border-border/50 bg-muted/10">
              {isCompleted && projectId && (
                <>
                  <Button
                    size="sm"
                    onClick={handleApply}
                    disabled={applying || isCreating || children.length === 0}
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
                    disabled={children.length === 0}
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
                </>
              )}
              {isApplied && (
                <span className="text-sm text-green-600 flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  已创建子节点
                </span>
              )}
              {(isPending || isProcessing) && isActive && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                  取消
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
