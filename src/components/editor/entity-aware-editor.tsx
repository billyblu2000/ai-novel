"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Entity } from "@/types";
import { EntityHighlight } from "@/lib/tiptap-entity-highlight";
import { EntityHoverCard } from "@/components/entities/entity-hover-card";
import { EntityContextMenu } from "@/components/entities/entity-context-menu";

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
}: EntityAwareEditorProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(content);

  // Hover card state
  const [hoveredEntity, setHoveredEntity] = useState<Entity | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Context menu state
  const [contextMenuEntity, setContextMenuEntity] = useState<Entity | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

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

  // Handle Ctrl+S manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor, onSave]);

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
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Get character/word count
  const characterCount = editor?.storage.characterCount?.characters() || 0;
  const wordCount = editor?.storage.characterCount?.words() || 0;

  return (
    <div className={cn("relative", className)}>
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
    </div>
  );
}
