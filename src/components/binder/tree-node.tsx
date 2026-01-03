"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { TreeNode } from "@/lib/hooks";
import { NodeType, RootFolderCategory } from "@/types";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";

interface TreeNodeItemProps {
  node: TreeNode;
  isSelected: boolean;
  isExpanded: boolean;
  isEditing: boolean;
  isRoot: boolean;
  rootCategory: RootFolderCategory | null;
  onSelect: () => void;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onCreate: (type: NodeType) => void;
}


export function TreeNodeItem({
  node,
  isSelected,
  isExpanded,
  isEditing,
  isRoot,
  rootCategory,
  onSelect,
  onToggleExpand,
  onStartEdit,
  onRename,
  onDelete,
  onCreate,
}: TreeNodeItemProps) {

  const [editValue, setEditValue] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id, disabled: isRoot });


  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset edit value when node title changes
  useEffect(() => {
    setEditValue(node.title);
  }, [node.title]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onRename(editValue);
    } else if (e.key === "Escape") {
      setEditValue(node.title);
      onRename(node.title); // Cancel edit
    }
  };

  const handleBlur = () => {
    onRename(editValue);
  };

  const handleClick = () => {
    if (!isEditing) {
      onSelect();
    }
  };

  const handleDoubleClick = () => {
    if (node.type === "FOLDER") {
      onToggleExpand();
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand();
  };

  const isFolder = node.type === "FOLDER";
  const hasChildren = node.children.length > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer select-none",
            "hover:bg-accent/50 transition-colors",
            isSelected && "bg-accent",
            isDragging && "opacity-50"
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          {/* Indentation */}
          <div style={{ width: node.depth * 16 }} />

          {/* Expand/Collapse chevron for folders */}
          {isFolder ? (
            hasChildren || isRoot ? (
              <button
                onClick={handleChevronClick}
                className="p-0.5 hover:bg-accent rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )
          ) : (
            <div className="w-5" /> // Spacer for files
          )}


          {/* Icon */}
          {isFolder ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-yellow-500 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-yellow-500 shrink-0" />
            )
          ) : (
            <FileText className="h-4 w-4 text-blue-500 shrink-0" />
          )}

          {/* Title or Input */}
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="h-6 py-0 px-1 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate flex-1">{node.title}</span>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        {isFolder && (
          <>
            <ContextMenuItem onClick={() => onCreate("FILE")}>
              <FilePlus className="h-4 w-4 mr-2" />
              {rootCategory === "NOTES" ? "新建笔记" : "新建场景"}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onCreate("FOLDER")}>
              <FolderPlus className="h-4 w-4 mr-2" />
              {rootCategory === "NOTES" ? "新建文件夹" : "新建章节"}
            </ContextMenuItem>
            {!isRoot && <ContextMenuSeparator />}
          </>
        )}

        {!isRoot && (
          <>
            <ContextMenuItem onClick={onStartEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              重命名
              <span className="ml-auto text-xs text-muted-foreground">F2</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
              <span className="ml-auto text-xs text-muted-foreground">Delete</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>

    </ContextMenu>
  );
}
