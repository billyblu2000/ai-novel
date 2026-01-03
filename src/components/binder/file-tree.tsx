"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { TreeNodeItem } from "./tree-node";
import { Node, NodeType } from "@/types";
import {
  useNodes,
  buildTree,
  flattenTree,
  getSiblings,
  calculateNewOrder,
  TreeNode,
} from "@/lib/hooks";
import { useEditorStore } from "@/lib/stores";
import { FolderPlus, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileTreeProps {
  projectId: string;
  onNodeSelect?: (node: Node) => void;
}

export function FileTree({ projectId, onNodeSelect }: FileTreeProps) {
  const {
    nodes,
    isLoading,
    createNode,
    updateNode,
    deleteNode,
    moveNode,
    isCreating,
  } = useNodes(projectId);

  const { activeNodeId, setActiveNode } = useEditorStore();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null);

  // Build tree structure
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const flatNodes = useMemo(() => flattenTree(tree), [tree]);

  // Filter visible nodes based on expanded state
  const visibleNodes = useMemo(() => {
    const visible: TreeNode[] = [];
    const isAncestorCollapsed = (node: TreeNode): boolean => {
      if (!node.parent_id) return false;
      const parent = flatNodes.find((n) => n.id === node.parent_id);
      if (!parent) return false;
      if (!expandedIds.has(parent.id)) return true;
      return isAncestorCollapsed(parent);
    };

    flatNodes.forEach((node) => {
      if (!isAncestorCollapsed(node)) {
        visible.push(node);
      }
    });

    return visible;
  }, [flatNodes, expandedIds]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Toggle folder expansion
  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle node selection
  const handleSelect = useCallback(
    (node: Node) => {
      setActiveNode(node.id);
      onNodeSelect?.(node);
    },
    [setActiveNode, onNodeSelect]
  );

  // Handle rename
  const handleRename = useCallback(
    (nodeId: string, newTitle: string) => {
      if (newTitle.trim()) {
        updateNode({ nodeId, title: newTitle.trim() });
      }
      setEditingId(null);
    },
    [updateNode]
  );

  // Handle delete
  const handleDelete = useCallback(
    (nodeId: string) => {
      deleteNode(nodeId);
      if (activeNodeId === nodeId) {
        setActiveNode(null);
      }
    },
    [deleteNode, activeNodeId, setActiveNode]
  );

  // Handle create node
  const handleCreate = useCallback(
    (type: NodeType, parentId: string | null = null) => {
      const title = type === "FOLDER" ? "新文件夹" : "新场景";
      const siblings = getSiblings(nodes, parentId);
      const order = calculateNewOrder(siblings, siblings.length);

      createNode({
        projectId,
        parentId,
        type,
        title,
        order,
      });

      // Expand parent if creating inside a folder
      if (parentId) {
        setExpandedIds((prev) => new Set(prev).add(parentId));
      }
    },
    [createNode, projectId, nodes]
  );

  // DnD handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const node = flatNodes.find((n) => n.id === event.active.id);
      if (node) {
        setDraggedNode(node);
      }
    },
    [flatNodes]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDraggedNode(null);

      if (!over || active.id === over.id) return;

      const activeNode = flatNodes.find((n) => n.id === active.id);
      const overNode = flatNodes.find((n) => n.id === over.id);

      if (!activeNode || !overNode) return;

      // Determine new parent and order
      let newParentId: string | null;
      let newOrder: string;

      if (overNode.type === "FOLDER" && expandedIds.has(overNode.id)) {
        // Drop into expanded folder - make it the first child
        newParentId = overNode.id;
        const children = getSiblings(nodes, overNode.id);
        newOrder = calculateNewOrder(children, 0);
      } else {
        // Drop as sibling
        newParentId = overNode.parent_id;
        const siblings = getSiblings(nodes, overNode.parent_id);
        const overIndex = siblings.findIndex((s) => s.id === overNode.id);
        newOrder = calculateNewOrder(siblings, overIndex + 1);
      }

      // Prevent moving into own descendants
      if (newParentId) {
        let checkId: string | null = newParentId;
        while (checkId) {
          if (checkId === activeNode.id) return;
          const parent = nodes.find((n) => n.id === checkId);
          checkId = parent?.parent_id || null;
        }
      }

      moveNode({
        nodeId: activeNode.id,
        parentId: newParentId,
        order: newOrder,
      });
    },
    [flatNodes, expandedIds, nodes, moveNode]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not editing
      if (editingId) return;

      // Ctrl+N: Create new file in current folder
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        const activeNode = nodes.find((n) => n.id === activeNodeId);
        const parentId = activeNode?.type === "FOLDER" ? activeNode.id : activeNode?.parent_id || null;
        handleCreate("FILE", parentId);
      }

      // Ctrl+Shift+N: Create new folder
      if (e.ctrlKey && e.shiftKey && e.key === "N") {
        e.preventDefault();
        const activeNode = nodes.find((n) => n.id === activeNodeId);
        const parentId = activeNode?.type === "FOLDER" ? activeNode.id : activeNode?.parent_id || null;
        handleCreate("FOLDER", parentId);
      }

      // F2: Rename
      if (e.key === "F2" && activeNodeId) {
        e.preventDefault();
        setEditingId(activeNodeId);
      }

      // Delete: Delete node
      if (e.key === "Delete" && activeNodeId) {
        e.preventDefault();
        handleDelete(activeNodeId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeNodeId, editingId, nodes, handleCreate, handleDelete]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4 ml-4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4 ml-4" />
        <Skeleton className="h-6 w-3/4 ml-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCreate("FOLDER", null)}
          disabled={isCreating}
          title="新建文件夹 (Ctrl+Shift+N)"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCreate("FILE", null)}
          disabled={isCreating}
          title="新建场景 (Ctrl+N)"
        >
          <FilePlus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
        >
          <SortableContext
            items={visibleNodes.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="p-2">
              {visibleNodes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">暂无内容</p>
                  <p className="text-xs mt-1">点击上方按钮创建</p>
                </div>
              ) : (
                visibleNodes.map((node) => (
                  <TreeNodeItem
                    key={node.id}
                    node={node}
                    isSelected={activeNodeId === node.id}
                    isExpanded={expandedIds.has(node.id)}
                    isEditing={editingId === node.id}
                    onSelect={() => handleSelect(node)}
                    onToggleExpand={() => toggleExpand(node.id)}
                    onStartEdit={() => setEditingId(node.id)}
                    onRename={(title) => handleRename(node.id, title)}
                    onDelete={() => handleDelete(node.id)}
                    onCreate={(type) => handleCreate(type, node.type === "FOLDER" ? node.id : node.parent_id)}
                  />
                ))
              )}
            </div>
          </SortableContext>

          <DragOverlay>
            {draggedNode && (
              <div className="bg-background border rounded-md px-2 py-1 shadow-lg">
                {draggedNode.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </ScrollArea>
    </div>
  );
}
