"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
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
import { FolderPlus, FilePlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TreeNodeItem } from "./tree-node";
import { Node, NodeType, FolderMetadata, RootFolderCategory } from "@/types";
import {
  useNodes,
  buildTree,
  flattenTree,
  getSiblings,
  calculateNewOrder,
  TreeNode,
} from "@/lib/hooks";
import { useEditorStore } from "@/lib/stores";


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

  const isRootFolder = useCallback((node: TreeNode): boolean => {
    if (node.type !== "FOLDER") return false;
    if (node.parent_id !== null) return false;
    const metadata = node.metadata as FolderMetadata;
    return !!metadata?.root_category;
  }, []);

  const getRootCategory = useCallback(
    (node: TreeNode): RootFolderCategory | null => {
      let current: TreeNode | undefined = node;
      while (current) {
        if (current.parent_id === null) {
          const metadata = current.metadata as FolderMetadata;
          return (metadata?.root_category as RootFolderCategory) || null;
        }
        current = flatNodes.find((n) => n.id === current!.parent_id);
      }
      return null;
    },
    [flatNodes]
  );




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

  // Initialize expanded state from metadata (default: expand all non-collapsed folders)
  useEffect(() => {
    if (nodes.length === 0) return;

    setExpandedIds((prev) => {
      // If user already interacted, don't override.
      if (prev.size > 0) return prev;

      const next = new Set<string>();
      nodes.forEach((n) => {
        if (n.type !== "FOLDER") return;
        const meta = n.metadata as FolderMetadata;
        const collapsed = meta?.collapsed ?? false;
        if (!collapsed) next.add(n.id);
      });
      return next;
    });
  }, [nodes]);

  // Toggle folder expansion (persist collapsed to metadata)
  const toggleExpand = useCallback(
    (nodeId: string) => {
      const node = flatNodes.find((n) => n.id === nodeId);
      if (!node || node.type !== "FOLDER") return;

      setExpandedIds((prev) => {
        const next = new Set(prev);
        const willExpand = !next.has(nodeId);
        if (willExpand) next.add(nodeId);
        else next.delete(nodeId);
        return next;
      });

      const meta = node.metadata as FolderMetadata;
      updateNode({
        nodeId,
        metadata: {
          ...meta,
          collapsed: expandedIds.has(nodeId),
        },
      });
    },
    [flatNodes, updateNode, expandedIds]
  );


  // Handle node selection
  const handleSelect = useCallback(
    (node: Node) => {
      setActiveNode(node.id);
      onNodeSelect?.(node);
    },
    [setActiveNode, onNodeSelect]
  );

  // Handle rename (prevent renaming root folders)
  const handleRename = useCallback(
    (nodeId: string, newTitle: string) => {
      const node = flatNodes.find((n) => n.id === nodeId);
      if (node && isRootFolder(node)) {
        setEditingId(null);
        return;
      }

      if (newTitle.trim()) {
        updateNode({ nodeId, title: newTitle.trim() });
      }
      setEditingId(null);
    },
    [updateNode, flatNodes, isRootFolder]
  );


  // Handle delete - prevent deleting root folders
  const handleDelete = useCallback(
    (nodeId: string) => {
      const node = flatNodes.find((n) => n.id === nodeId);
      if (node && isRootFolder(node)) {
        return; // Don't delete root folders
      }
      deleteNode(nodeId);
      if (activeNodeId === nodeId) {
        setActiveNode(null);
      }
    },
    [deleteNode, activeNodeId, setActiveNode, flatNodes, isRootFolder]
  );

  // Handle create node - always create inside a root folder
  const handleCreate = useCallback(
    (type: NodeType, parentId: string | null = null) => {
      // Prefer creating within current context (active folder / active node's parent)
      let targetParentId = parentId;
      if (!targetParentId && activeNodeId) {
        const active = nodes.find((n) => n.id === activeNodeId);
        if (active) {
          targetParentId = active.type === "FOLDER" ? active.id : active.parent_id;
        }
      }

      // If still no parent specified, default to MANUSCRIPT root
      if (!targetParentId) {
        const manuscriptRoot = nodes.find((n) => {
          const meta = n.metadata as FolderMetadata;
          return n.parent_id === null && meta?.root_category === "MANUSCRIPT";
        });
        targetParentId = manuscriptRoot?.id || null;
      }

      if (!targetParentId) return;

      const parentNode = flatNodes.find((n) => n.id === targetParentId);
      const rootCategory = parentNode ? getRootCategory(parentNode) : "MANUSCRIPT";
      const isNotes = rootCategory === "NOTES";

      const title =
        type === "FOLDER"
          ? isNotes
            ? "新文件夹"
            : "新章节"
          : isNotes
            ? "新笔记"
            : "新场景";

      const siblings = getSiblings(nodes, targetParentId);
      const order = calculateNewOrder(siblings, siblings.length);

      createNode({
        projectId,
        parentId: targetParentId,
        type,
        title,
        order,
      });

      // Expand parent if creating inside a folder
      setExpandedIds((prev) => new Set(prev).add(targetParentId));
    },
    [createNode, projectId, nodes, flatNodes, getRootCategory, activeNodeId]
  );


  // DnD handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const node = flatNodes.find((n) => n.id === event.active.id);
      if (!node) return;
      if (isRootFolder(node)) return;
      setDraggedNode(node);
    },
    [flatNodes, isRootFolder]
  );


  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDraggedNode(null);

      if (!over || active.id === over.id) return;

      const activeNode = flatNodes.find((n) => n.id === active.id);
      const overNode = flatNodes.find((n) => n.id === over.id);

      if (!activeNode || !overNode) return;
      if (isRootFolder(activeNode)) return;

      // Determine new parent and order
      let newParentId: string;
      let newOrder: string;

      const overIsRoot = isRootFolder(overNode);

      if (overIsRoot) {
        // Always drop into root folder (never allow parent_id = null)
        newParentId = overNode.id;
        const children = getSiblings(nodes, overNode.id);
        newOrder = calculateNewOrder(children, children.length);
      } else if (overNode.type === "FOLDER" && expandedIds.has(overNode.id)) {
        // Drop into expanded folder - make it the first child
        newParentId = overNode.id;
        const children = getSiblings(nodes, overNode.id);
        newOrder = calculateNewOrder(children, 0);
      } else {
        // Drop as sibling
        if (!overNode.parent_id) return; // should not happen (root handled above)
        newParentId = overNode.parent_id;
        const siblings = getSiblings(nodes, overNode.parent_id);
        const overIndex = siblings.findIndex((s) => s.id === overNode.id);
        newOrder = calculateNewOrder(siblings, overIndex + 1);
      }

      // Prevent moving across root categories (MANUSCRIPT <-> NOTES)
      const activeRoot = getRootCategory(activeNode);
      const targetParent = flatNodes.find((n) => n.id === newParentId);
      if (!targetParent) return;
      const targetRoot = getRootCategory(targetParent);
      if (activeRoot && targetRoot && activeRoot !== targetRoot) return;

      // Prevent moving into own descendants
      let checkId: string | null = newParentId;
      while (checkId) {
        if (checkId === activeNode.id) return;
        const parent = nodes.find((n) => n.id === checkId);
        checkId = parent?.parent_id || null;
      }

      moveNode({
        nodeId: activeNode.id,
        parentId: newParentId,
        order: newOrder,
      });
    },
    [flatNodes, expandedIds, nodes, moveNode, isRootFolder, getRootCategory]
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
        const activeNode = flatNodes.find((n) => n.id === activeNodeId);
        if (activeNode && isRootFolder(activeNode)) return;
        setEditingId(activeNodeId);
      }

      // Delete: Delete node
      if (e.key === "Delete" && activeNodeId) {
        e.preventDefault();
        const activeNode = flatNodes.find((n) => n.id === activeNodeId);
        if (activeNode && isRootFolder(activeNode)) return;
        handleDelete(activeNodeId);
      }

    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeNodeId, editingId, nodes, handleCreate, handleDelete, flatNodes, isRootFolder]);


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
          title="新建文件 (Ctrl+N)"
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
                    isRoot={isRootFolder(node)}
                    rootCategory={getRootCategory(node)}
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
