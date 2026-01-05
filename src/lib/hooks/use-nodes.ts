"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Node, NodeType, ApiResult } from "@/types";
import { generateKeyBetween } from "fractional-indexing";

// ============ API Functions ============

async function fetchNodes(projectId: string): Promise<Node[]> {
  const response = await fetch(`/api/projects/${projectId}/nodes`);
  const result: ApiResult<Node[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

interface CreateNodeInput {
  projectId: string;
  parentId: string | null;
  type: NodeType;
  title: string;
  order?: string;
  outline?: string;
  summary?: string;
}

async function createNode(input: CreateNodeInput): Promise<Node> {
  const response = await fetch(`/api/projects/${input.projectId}/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parent_id: input.parentId,
      type: input.type,
      title: input.title,
      order: input.order,
      outline: input.outline,
      summary: input.summary,
    }),
  });

  const result: ApiResult<Node> = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

interface UpdateNodeInput {
  nodeId: string;
  title?: string;
  content?: string;
  outline?: string;
  summary?: string;
  order?: string;
  metadata?: Record<string, unknown>;
}

async function updateNode(input: UpdateNodeInput): Promise<Node> {
  const { nodeId, ...data } = input;
  const response = await fetch(`/api/nodes/${nodeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result: ApiResult<Node> = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

async function deleteNode(nodeId: string): Promise<{ id: string }> {
  const response = await fetch(`/api/nodes/${nodeId}`, {
    method: "DELETE",
  });

  const result: ApiResult<{ id: string }> = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

interface MoveNodeInput {
  nodeId: string;
  parentId: string | null;
  order: string;
}

async function moveNode(input: MoveNodeInput): Promise<Node> {
  const { nodeId, parentId, order } = input;
  const response = await fetch(`/api/nodes/${nodeId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parent_id: parentId, order }),
  });

  const result: ApiResult<Node> = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

// ============ Hook ============

export function useNodes(projectId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["nodes", projectId];

  // Query: Fetch all nodes
  const query = useQuery({
    queryKey,
    queryFn: () => fetchNodes(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation: Create node
  const createMutation = useMutation({
    mutationFn: createNode,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNodes = queryClient.getQueryData<Node[]>(queryKey);

      // Optimistic update
      const tempNode: Node = {
        id: `temp-${Date.now()}`,
        project_id: input.projectId,
        parent_id: input.parentId,
        type: input.type,
        title: input.title,
        content: "",
        outline: "",
        summary: "",
        order: input.order || "a0",
        metadata: input.type === "FILE"
          ? { status: "DRAFT" as const, word_count: 0, ignored_entities: [] }
          : { collapsed: false },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Node[]>(queryKey, (old) => [...(old || []), tempNode]);

      return { previousNodes, tempNode };
    },
    onError: (err, _, context) => {
      if (context?.previousNodes) {
        queryClient.setQueryData(queryKey, context.previousNodes);
      }
      toast.error(`创建失败: ${err.message}`);
    },
    onSuccess: (newNode, _, context) => {
      // Replace temp node with real node
      queryClient.setQueryData<Node[]>(queryKey, (old) =>
        old?.map((n) => (n.id === context?.tempNode.id ? newNode : n)) || [newNode]
      );
      toast.success("创建成功");
    },
  });

  // Mutation: Update node
  const updateMutation = useMutation({
    mutationFn: updateNode,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNodes = queryClient.getQueryData<Node[]>(queryKey);

      // Optimistic update - only update fields that are provided
      queryClient.setQueryData<Node[]>(queryKey, (old) =>
        old?.map((n) => {
          if (n.id !== input.nodeId) return n;
          const updated: Node = { ...n, updated_at: new Date().toISOString() };
          if (input.title !== undefined) updated.title = input.title;
          if (input.content !== undefined) updated.content = input.content;
          if (input.outline !== undefined) updated.outline = input.outline;
          if (input.summary !== undefined) updated.summary = input.summary;
          if (input.order !== undefined) updated.order = input.order;
          if (input.metadata !== undefined) updated.metadata = input.metadata as unknown as Node["metadata"];
          return updated;
        })
      );

      return { previousNodes };
    },
    onError: (err, _, context) => {
      if (context?.previousNodes) {
        queryClient.setQueryData(queryKey, context.previousNodes);
      }
      toast.error(`更新失败: ${err.message}`);
    },
  });

  // Mutation: Delete node
  const deleteMutation = useMutation({
    mutationFn: deleteNode,
    onMutate: async (nodeId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNodes = queryClient.getQueryData<Node[]>(queryKey);

      // Get all descendant IDs to remove
      const nodesToRemove = new Set<string>();
      const collectDescendants = (parentId: string) => {
        nodesToRemove.add(parentId);
        previousNodes
          ?.filter((n) => n.parent_id === parentId)
          .forEach((n) => collectDescendants(n.id));
      };
      collectDescendants(nodeId);

      // Optimistic update
      queryClient.setQueryData<Node[]>(queryKey, (old) =>
        old?.filter((n) => !nodesToRemove.has(n.id))
      );

      return { previousNodes };
    },
    onError: (err, _, context) => {
      if (context?.previousNodes) {
        queryClient.setQueryData(queryKey, context.previousNodes);
      }
      toast.error(`删除失败: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("删除成功");
    },
  });

  // Mutation: Move node
  const moveMutation = useMutation({
    mutationFn: moveNode,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNodes = queryClient.getQueryData<Node[]>(queryKey);

      // Optimistic update
      queryClient.setQueryData<Node[]>(queryKey, (old) =>
        old?.map((n) =>
          n.id === input.nodeId
            ? { ...n, parent_id: input.parentId, order: input.order, updated_at: new Date().toISOString() }
            : n
        )
      );

      return { previousNodes };
    },
    onError: (err, _, context) => {
      if (context?.previousNodes) {
        queryClient.setQueryData(queryKey, context.previousNodes);
      }
      toast.error(`移动失败: ${err.message}`);
    },
  });

  return {
    // Query state
    nodes: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Mutations
    createNode: createMutation.mutate,
    createNodeAsync: createMutation.mutateAsync,
    updateNode: updateMutation.mutate,
    deleteNode: deleteMutation.mutate,
    moveNode: moveMutation.mutate,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMoving: moveMutation.isPending,
  };
}

// ============ Tree Utilities ============

export interface TreeNode extends Node {
  children: TreeNode[];
  depth: number;
}

/**
 * Convert flat nodes array to tree structure
 */
export function buildTree(nodes: Node[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // First pass: create TreeNode objects
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [], depth: 0 });
  });

  // Second pass: build tree structure
  nodes.forEach((node) => {
    const treeNode = nodeMap.get(node.id)!;

    if (node.parent_id && nodeMap.has(node.parent_id)) {
      const parent = nodeMap.get(node.parent_id)!;
      parent.children.push(treeNode);
      treeNode.depth = parent.depth + 1;
    } else {
      roots.push(treeNode);
    }
  });

  // Sort children by order
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.order.localeCompare(b.order));
    nodes.forEach((node) => sortChildren(node.children));
  };
  sortChildren(roots);

  return roots;
}

/**
 * Flatten tree back to array (for rendering with indentation)
 */
export function flattenTree(tree: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];

  const traverse = (nodes: TreeNode[]) => {
    nodes.forEach((node) => {
      result.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    });
  };

  traverse(tree);
  return result;
}

/**
 * Get siblings of a node
 */
export function getSiblings(nodes: Node[], parentId: string | null): Node[] {
  return nodes
    .filter((n) => n.parent_id === parentId)
    .sort((a, b) => a.order.localeCompare(b.order));
}

/**
 * Calculate new order for inserting a node
 */
export function calculateNewOrder(
  siblings: Node[],
  insertIndex: number
): string {
  const prevOrder = insertIndex > 0 ? siblings[insertIndex - 1]?.order : null;
  const nextOrder = insertIndex < siblings.length ? siblings[insertIndex]?.order : null;
  return generateKeyBetween(prevOrder, nextOrder);
}

/**
 * Count total words in a tree
 */
export function countWords(nodes: Node[]): number {
  return nodes.reduce((total, node) => {
    if (node.type === "FILE") {
      const metadata = node.metadata as { word_count?: number };
      return total + (metadata.word_count || 0);
    }
    return total;
  }, 0);
}

/**
 * Count nodes by type
 */
export function countNodesByType(nodes: Node[]): { folders: number; files: number } {
  return nodes.reduce(
    (counts, node) => {
      if (node.type === "FOLDER") {
        counts.folders++;
      } else {
        counts.files++;
      }
      return counts;
    },
    { folders: 0, files: 0 }
  );
}
