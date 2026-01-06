"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Entity } from "@/types";
import type { NodeInfo } from "@/lib/ai/types";
import { EntityHighlight } from "@/lib/tiptap-entity-highlight";
import { EntityHoverCard } from "@/components/entities/entity-hover-card";
import { EntityContextMenu } from "@/components/entities/entity-context-menu";
import { AIContextMenu } from "@/components/ai/ai-context-menu";

interface EntityAwareEditorProps {
  content: string;
  placeholder?: string;
  onUpdate?: (content: string) => void;
  onSave?: (content: string) => void;
  editable?: boolean;
  className?: string;
  showWordCount?: boolean;
  autoFocus?: boolean;
  entities?: Entity[];
  ignoredEntities?: string[];
  onIgnoreEntity?: (entityName: string) => void;
  onViewEntityDetails?: (entity: Entity) => void;
  /** 当前场景节点（用于 AI 上下文增强） */
  currentNode?: NodeInfo | null;
  /** 父章节节点（用于 AI 上下文增强） */
  parentNode?: NodeInfo | null;
  /** Tab 键续写回调 */
  onTabContinue?: (cursorPosition: number, textContent: string) => void;
}

export function EntityAwareEditor({
  content,
  placeholder = "开始写作...",
  onUpdate,
  onSave,
  editable = true,
  className,
  showWordCount = false,
  autoFocus = false,
  entities = [],
  ignoredEntities = [],
  onIgnoreEntity,
  onViewEntityDetails,
  currentNode,
  parentNode,
  onTabContinue,
}: EntityAwareEditorProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(content);

  // Hover card state
  const [hoveredEntity, setHoveredEntity] = useState<Entity | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Context menu state (Entity)
  const [contextMenuEntity, setContextMenuEntity] = useState<Entity | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // AI Context menu state (Text selection)
  const [aiMenuVisible, setAiMenuVisible] = useState(false);
  const [aiMenuPosition, setAiMenuPosition] = useState({ x: 0, y: 0 });
  const [aiMenuSelectedText, setAiMenuSelectedText] = useState("");
  const [aiMenuSelectionRange, setAiMenuSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [aiMenuMentionedEntityIds, setAiMenuMentionedEntityIds] = useState<string[]>([]);

  const handleEntityHover = useCallback(
    (entity: Entity | null, rect: DOMRect | null) => {
      // Clear any pending hover timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      if (entity && rect) {
        // Delay showing the hover card (300ms as per PRD)
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredEntity(entity);
          setHoverPosition({ x: rect.left, y: rect.bottom });
        }, 300);
      } else {
        // Small delay before hiding to allow moving to the card
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredEntity(null);
        }, 100);
      }
    },
    []
  );

  const handleEntityContextMenu = useCallback(
    (entity: Entity, event: MouseEvent) => {
      setContextMenuEntity(entity);
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
    },
    []
  );

  const handleIgnoreEntity = useCallback(
    (entityName: string) => {
      onIgnoreEntity?.(entityName);
    },
    [onIgnoreEntity]
  );

  const handleViewDetails = useCallback(
    (entity: Entity) => {
      onViewEntityDetails?.(entity);
    },
    [onViewEntityDetails]
  );

  const editor = useEditor({
    // Next.js App Router will SSR client components; disable immediate render to avoid hydration mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      CharacterCount,
      EntityHighlight.configure({
        entities,
        ignoredEntities,
        onEntityHover: handleEntityHover,
        onEntityContextMenu: handleEntityContextMenu,
      }),
    ],
    content,
    editable,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose dark:prose-invert max-w-none",
          "focus:outline-none min-h-[200px]",
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-p:text-foreground prose-p:leading-relaxed",
          "prose-strong:text-foreground",
          "prose-ul:text-foreground prose-ol:text-foreground",
          "prose-blockquote:text-muted-foreground prose-blockquote:border-border"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onUpdate?.(html);

      // Auto-save with 3s debounce
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        if (html !== lastSavedContentRef.current) {
          onSave?.(html);
          lastSavedContentRef.current = html;
        }
      }, 3000);
    },
  });

  // Handle right-click for AI context menu (text selection)
  const handleEditorContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!editor) return;

      // 获取选中的文字
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      // 如果有选中文字且不是在实体上右键，显示 AI 菜单
      if (selectedText && selectedText.length > 0) {
        // 检查是否在实体高亮上右键（实体有自己的右键菜单）
        const target = e.target as HTMLElement;
        if (target.closest("[data-entity-id]")) {
          return; // 让实体右键菜单处理
        }

        e.preventDefault();

        // 获取编辑器中的选中范围
        const { from, to } = editor.state.selection;

        // 提取选中范围内的实体 mention
        const mentionedEntityIds: string[] = [];
        editor.state.doc.nodesBetween(from, to, (node) => {
          // 检查节点的 marks 中是否有 entityHighlight
          if (node.marks) {
            for (const mark of node.marks) {
              if (mark.type.name === "entityHighlight" && mark.attrs.entityId) {
                if (!mentionedEntityIds.includes(mark.attrs.entityId)) {
                  mentionedEntityIds.push(mark.attrs.entityId);
                }
              }
            }
          }
          return true;
        });

        // 计算纯文本位置（用于前后文提取）
        // 注意：这里的 from/to 是 ProseMirror 位置，需要转换为纯文本位置
        let textPosition = 0;
        let selectionStart = 0;
        let selectionEnd = 0;
        let foundStart = false;

        editor.state.doc.descendants((node, pos) => {
          if (node.isText && node.text) {
            const nodeEnd = pos + node.nodeSize;
            if (!foundStart && from >= pos && from <= nodeEnd) {
              selectionStart = textPosition + (from - pos);
              foundStart = true;
            }
            if (to >= pos && to <= nodeEnd) {
              selectionEnd = textPosition + (to - pos);
            }
            textPosition += node.text.length;
          }
          return true;
        });

        setAiMenuSelectedText(selectedText);
        setAiMenuPosition({ x: e.clientX, y: e.clientY });
        setAiMenuSelectionRange({ start: selectionStart, end: selectionEnd });
        setAiMenuMentionedEntityIds(mentionedEntityIds);
        setAiMenuVisible(true);
      }
    },
    [editor]
  );

  // Update entities when they change
  useEffect(() => {
    if (editor) {
      editor.commands.setEntities(entities);
    }
  }, [editor, entities]);

  // Update ignored entities when they change
  useEffect(() => {
    if (editor) {
      editor.commands.setIgnoredEntities(ignoredEntities);
    }
  }, [editor, ignoredEntities]);

  // Handle Ctrl+S manual save and Tab for AI continue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (editor) {
          const html = editor.getHTML();
          if (html !== lastSavedContentRef.current) {
            onSave?.(html);
            lastSavedContentRef.current = html;
          }
          // Clear pending auto-save
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
        }
      }

      // Tab: AI Continue (only when no selection)
      if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (!editor || !onTabContinue) return;

        // 检查是否有选中文本（有选中文本时不触发续写）
        const { from, to } = editor.state.selection;
        if (from !== to) return;

        e.preventDefault();

        // 计算光标在纯文本中的位置
        let textPosition = 0;
        let cursorTextPosition = 0;
        let foundCursor = false;

        editor.state.doc.descendants((node, pos) => {
          if (foundCursor) return false;

          if (node.isText && node.text) {
            const nodeEnd = pos + node.nodeSize;
            if (from >= pos && from <= nodeEnd) {
              cursorTextPosition = textPosition + (from - pos);
              foundCursor = true;
              return false;
            }
            textPosition += node.text.length;
          }
          return true;
        });

        // 获取纯文本内容
        const textContent = editor.state.doc.textContent;

        // 触发续写回调
        onTabContinue(cursorTextPosition, textContent);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor, onSave, onTabContinue]);

  // Update content when prop changes (e.g., switching nodes)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
      lastSavedContentRef.current = content;
    }
  }, [editor, content]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenuEntity(null);
      setAiMenuVisible(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Listen for AI apply modify event
  useEffect(() => {
    const handleApplyModify = (e: CustomEvent<{ text: string; originalText: string }>) => {
      if (!editor) return;

      const { text, originalText } = e.detail;

      // 获取当前编辑器内容
      const currentContent = editor.getHTML();

      // 尝试查找并替换原文
      // 方法1：如果有选中内容，直接替换选中内容
      const { from, to } = editor.state.selection;
      if (from !== to) {
        // 有选中内容，直接替换
        editor.chain().focus().deleteSelection().insertContent(text).run();
        return;
      }

      // 方法2：尝试在文档中查找原文并替换
      // 将原文转换为纯文本进行搜索
      const docText = editor.state.doc.textContent;
      const originalTextClean = originalText.trim();

      if (docText.includes(originalTextClean)) {
        // 找到原文在文档中的位置
        let pos = 0;
        let found = false;

        editor.state.doc.descendants((node, nodePos) => {
          if (found) return false;

          if (node.isText && node.text) {
            const index = node.text.indexOf(originalTextClean);
            if (index !== -1) {
              pos = nodePos + index;
              found = true;
              return false;
            }
          }
          return true;
        });

        if (found) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from: pos, to: pos + originalTextClean.length })
            .deleteSelection()
            .insertContent(text)
            .run();
          return;
        }
      }

      // 方法3：如果找不到原文，在光标位置插入
      editor.chain().focus().insertContent(text).run();
    };

    window.addEventListener("ai-apply-modify", handleApplyModify as EventListener);
    return () => {
      window.removeEventListener("ai-apply-modify", handleApplyModify as EventListener);
    };
  }, [editor]);

  // Listen for AI apply continue event (insert at cursor position)
  useEffect(() => {
    const handleApplyContinue = (e: CustomEvent<{ text: string }>) => {
      if (!editor) return;

      const { text } = e.detail;

      // 在光标位置插入续写内容
      editor.chain().focus().insertContent(text).run();
    };

    window.addEventListener("ai-apply-continue", handleApplyContinue as EventListener);
    return () => {
      window.removeEventListener("ai-apply-continue", handleApplyContinue as EventListener);
    };
  }, [editor]);

  // Get character/word count
  const characterCount = editor?.storage.characterCount?.characters() || 0;
  const wordCount = editor?.storage.characterCount?.words() || 0;

  return (
    <div className={cn("relative", className)} onContextMenu={handleEditorContextMenu}>
      <EditorContent editor={editor} />
      {showWordCount && (
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {wordCount} 字 / {characterCount} 字符
        </div>
      )}

      {/* Entity Hover Card */}
      {hoveredEntity && (
        <EntityHoverCard
          entity={hoveredEntity}
          position={hoverPosition}
          visible={true}
        />
      )}

      {/* Entity Context Menu */}
      {contextMenuEntity && (
        <EntityContextMenu
          entity={contextMenuEntity}
          position={contextMenuPosition}
          visible={true}
          onIgnore={handleIgnoreEntity}
          onViewDetails={handleViewDetails}
          onClose={() => setContextMenuEntity(null)}
        />
      )}

      {/* AI Context Menu */}
      {aiMenuVisible && aiMenuSelectedText && (
        <AIContextMenu
          selectedText={aiMenuSelectedText}
          position={aiMenuPosition}
          visible={true}
          onClose={() => setAiMenuVisible(false)}
          editorContent={editor?.state.doc.textContent}
          selectionStart={aiMenuSelectionRange?.start}
          selectionEnd={aiMenuSelectionRange?.end}
          currentNode={currentNode}
          parentNode={parentNode}
          entities={entities}
          mentionedEntityIds={aiMenuMentionedEntityIds}
        />
      )}
    </div>
  );
}
