"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content: string;
  placeholder?: string;
  onUpdate?: (content: string) => void;
  onSave?: (content: string) => void;
  editable?: boolean;
  className?: string;
  showWordCount?: boolean;
  autoFocus?: boolean;
}

export function TiptapEditor({
  content,
  placeholder = "开始写作...",
  onUpdate,
  onSave,
  editable = true,
  className,
  showWordCount = false,
  autoFocus = false,
}: TiptapEditorProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(content);

  const editor = useEditor({
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
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
    </div>
  );
}
