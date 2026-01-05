"use client";

import { useCallback, useEffect, useState } from "react";
import { useAIStore } from "@/lib/stores/ai-store";
import { Wand2, Expand, Minimize2, Sparkles, MessageSquare } from "lucide-react";
import type { AIFunction, NodeInfo } from "@/lib/ai/types";
import { buildModifyEnhancedContext, entitiesToUserContexts } from "@/lib/ai/context-builder";
import type { Entity } from "@/types";

interface AIContextMenuProps {
  /** 选中的文字 */
  selectedText: string;
  /** 菜单位置 */
  position: { x: number; y: number };
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 当前编辑器的完整内容（用于提取前后文） */
  editorContent?: string;
  /** 选中文本在编辑器中的位置（字符偏移） */
  selectionStart?: number;
  /** 选中文本在编辑器中的结束位置 */
  selectionEnd?: number;
  /** 当前场景节点 */
  currentNode?: NodeInfo | null;
  /** 父章节节点 */
  parentNode?: NodeInfo | null;
  /** 项目中的所有实体 */
  entities?: Entity[];
  /** 选中文本中包含的实体 ID 列表（从 mention 中提取） */
  mentionedEntityIds?: string[];
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  function: AIFunction;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: "润色",
    icon: <Wand2 className="h-4 w-4" />,
    function: "polish",
    description: "优化文字表达",
  },
  {
    label: "扩写",
    icon: <Expand className="h-4 w-4" />,
    function: "expand",
    description: "扩展内容细节",
  },
  {
    label: "缩写",
    icon: <Minimize2 className="h-4 w-4" />,
    function: "compress",
    description: "精简文字内容",
  },
];

/**
 * AI 右键菜单组件
 * 在编辑器中选中文字后显示，提供润色/扩写/缩写功能
 */
export function AIContextMenu({
  selectedText,
  position,
  visible,
  onClose,
  editorContent,
  selectionStart,
  selectionEnd,
  currentNode,
  parentNode,
  entities,
  mentionedEntityIds,
}: AIContextMenuProps) {
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  const {
    setCurrentFunction,
    addUserContext,
    clearUserContexts,
    clearModifyResult,
    toggleChatWindow,
    setSelectedText,
    setModifyEnhancedContext,
    contextEnhancementEnabled,
  } = useAIStore();

  // 调整菜单位置，确保不超出视口
  useEffect(() => {
    if (!visible) return;

    const menuWidth = 200;
    const menuHeight = 180;
    const padding = 8;

    let x = position.x;
    let y = position.y;

    // 检查右边界
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }

    // 检查下边界
    if (y + menuHeight > window.innerHeight - padding) {
      y = position.y - menuHeight - 10; // 显示在上方
    }

    // 确保不超出左边界和上边界
    x = Math.max(padding, x);
    y = Math.max(padding, y);

    setAdjustedPosition({ x, y });
  }, [position, visible]);

  // 处理菜单项点击
  const handleMenuClick = useCallback(
    (func: AIFunction) => {
      // 1. 清空之前的上下文和修改结果
      clearUserContexts();
      clearModifyResult();

      // 2. 设置选中的文字
      setSelectedText(selectedText);

      // 3. 添加选段作为上下文
      addUserContext({
        type: "selection",
        text: selectedText,
      });

      // 4. 构建并设置增强上下文（使用集中的构建器）
      const enhancedContext = contextEnhancementEnabled
        ? buildModifyEnhancedContext({
            editorContent,
            selectionStart,
            selectionEnd,
            currentNode,
            parentNode,
            mentionedEntityIds,
          })
        : null;
      setModifyEnhancedContext(enhancedContext);

      // 5. 如果有关联实体，添加到用户上下文
      if (enhancedContext?.relatedEntityIds && entities) {
        const entityContexts = entitiesToUserContexts(
          entities,
          enhancedContext.relatedEntityIds
        );
        for (const ctx of entityContexts) {
          addUserContext(ctx);
        }
      }

      // 6. 设置当前功能
      setCurrentFunction(func);

      // 7. 打开聊天窗口
      toggleChatWindow(true);

      // 8. 关闭菜单
      onClose();
    },
    [
      selectedText,
      entities,
      editorContent,
      selectionStart,
      selectionEnd,
      currentNode,
      parentNode,
      mentionedEntityIds,
      contextEnhancementEnabled,
      clearUserContexts,
      clearModifyResult,
      setSelectedText,
      addUserContext,
      setCurrentFunction,
      toggleChatWindow,
      onClose,
      setModifyEnhancedContext,
    ]
  );

  // 处理"添加为上下文"点击
  const handleAddAsContext = useCallback(() => {
    // 添加选段作为上下文
    addUserContext({
      type: "selection",
      text: selectedText,
    });

    // 打开聊天窗口
    toggleChatWindow(true);

    // 关闭菜单
    onClose();
  }, [selectedText, addUserContext, toggleChatWindow, onClose]);

  // ESC 关闭菜单
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed z-[100]"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      <div className="rounded-lg border bg-popover/95 backdrop-blur-sm shadow-lg min-w-[180px] py-1 animate-in fade-in zoom-in-95 duration-150">
        {/* 标题 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">AI 助手</span>
        </div>

        {/* 功能菜单项 */}
        <div className="py-1">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.function}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent cursor-pointer transition-colors"
              onClick={() => handleMenuClick(item.function)}
            >
              <span className="text-muted-foreground">{item.icon}</span>
              <div className="flex flex-col items-start">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  {item.description}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* 分隔线 */}
        <div className="border-t border-border/50 my-1" />

        {/* 添加为上下文 */}
        <div className="py-1">
          <button
            className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent cursor-pointer transition-colors"
            onClick={handleAddAsContext}
          >
            <span className="text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
            </span>
            <div className="flex flex-col items-start">
              <span className="font-medium">添加为上下文</span>
              <span className="text-xs text-muted-foreground">
                在对话中引用此文本
              </span>
            </div>
          </button>
        </div>

        {/* 选中文字预览 */}
        <div className="px-3 py-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground line-clamp-2">
            "{selectedText.length > 50 ? selectedText.slice(0, 50) + "..." : selectedText}"
          </p>
        </div>
      </div>
    </div>
  );
}
