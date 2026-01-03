import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { SupabaseClient } from "@supabase/supabase-js";

// Validation schema
const moveNodeSchema = z.object({
  parent_id: z.string().uuid().nullable(),
  order: z.string(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Helper: Check if user owns the node's project
 */
async function checkNodeOwnership(
  supabase: SupabaseClient,
  nodeId: string,
  userId: string
): Promise<{ id: string; project_id: string } | null> {
  const { data: node } = await supabase
    .from("nodes")
    .select("id, project_id, projects!inner(user_id)")
    .eq("id", nodeId)
    .single();

  if (!node) return null;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((node as any).projects?.user_id !== userId) return null;

  return { id: node.id, project_id: node.project_id };
}

/**
 * POST /api/nodes/[id]/move
 * 移动节点（更新 parent_id 和 order）
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: nodeId } = await context.params;
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const { supabase, user } = auth;

    const node = await checkNodeOwnership(supabase, nodeId, user.id);
    if (!node) {
      return notFoundResponse("节点不存在");
    }

    // Load existing node to protect system root folders
    const { data: existingNode, error: existingNodeError } = await supabase
      .from("nodes")
      .select("id, type, parent_id, metadata")
      .eq("id", nodeId)
      .single();

    if (existingNodeError || !existingNode) {
      console.error("Failed to fetch existing node:", existingNodeError);
      return internalErrorResponse("获取节点失败");
    }

    const isRootFolder =
      existingNode.type === "FOLDER" &&
      existingNode.parent_id === null &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      !!((existingNode.metadata as any)?.root_category);

    if (isRootFolder) {
      return validationErrorResponse("根目录不能移动");
    }

    // Parse and validate request body
    const body = await request.json();
    const result = moveNodeSchema.safeParse(body);


    if (!result.success) {
      return validationErrorResponse(result.error.issues[0].message);
    }

    const { parent_id, order } = result.data;

    // Disallow moving nodes to top-level (only system root folders are top-level)
    if (parent_id === null) {
      return validationErrorResponse("不能将节点移动到顶层");
    }


    // If moving to a new parent, verify the parent exists and belongs to the same project
    if (parent_id) {
      const { data: parentNode } = await supabase
        .from("nodes")
        .select("id, project_id")
        .eq("id", parent_id)
        .eq("project_id", node.project_id)
        .single();

      if (!parentNode) {
        return validationErrorResponse("目标父节点不存在");
      }

      // Prevent moving a node into its own descendants
      const isDescendant = await checkIsDescendant(supabase, parent_id, nodeId);
      if (isDescendant) {
        return validationErrorResponse("不能将节点移动到其子节点下");
      }
    }

    // Update the node
    const { data, error } = await supabase
      .from("nodes")
      .update({
        parent_id,
        order,
        updated_at: new Date().toISOString(),
      })
      .eq("id", nodeId)
      .select()
      .single();

    if (error) {
      console.error("Failed to move node:", error);
      return internalErrorResponse("移动节点失败");
    }

    // Update project's updated_at
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", node.project_id);

    return successResponse(data);
  } catch (error) {
    console.error("POST /api/nodes/[id]/move error:", error);
    return internalErrorResponse();
  }
}

/**
 * Check if targetId is a descendant of nodeId
 */
async function checkIsDescendant(
  supabase: SupabaseClient,
  targetId: string,
  nodeId: string
): Promise<boolean> {
  // Get all ancestors of targetId
  let currentId: string | null = targetId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === nodeId) {
      return true;
    }

    if (visited.has(currentId)) {
      // Circular reference detected, shouldn't happen but handle it
      break;
    }
    visited.add(currentId);

    const queryResult: { data: { parent_id: string | null } | null } = await supabase
      .from("nodes")
      .select("parent_id")
      .eq("id", currentId)
      .single();

    currentId = queryResult.data?.parent_id || null;
  }

  return false;
}
