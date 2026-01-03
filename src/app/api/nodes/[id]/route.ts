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

// Validation schemas
const updateNodeSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().optional(),
  outline: z.string().optional(),
  summary: z.string().optional(),
  order: z.string().optional(),
  metadata: z.any().optional(),
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
 * GET /api/nodes/[id]
 * 获取单个节点
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

    // Fetch full node data
    const { data, error } = await supabase
      .from("nodes")
      .select("*")
      .eq("id", nodeId)
      .single();

    if (error) {
      console.error("Failed to fetch node:", error);
      return internalErrorResponse("获取节点失败");
    }

    return successResponse(data);
  } catch (error) {
    console.error("GET /api/nodes/[id] error:", error);
    return internalErrorResponse();
  }
}

/**
 * PATCH /api/nodes/[id]
 * 更新节点
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    // Parse and validate request body
    const body = await request.json();
    const result = updateNodeSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(result.error.issues[0].message);
    }

    const updateData = {
      ...result.data,
      updated_at: new Date().toISOString(),
    };

    // Update the node
    const { data, error } = await supabase
      .from("nodes")
      .update(updateData)
      .eq("id", nodeId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update node:", error);
      return internalErrorResponse("更新节点失败");
    }

    // Update project's updated_at
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", node.project_id);

    return successResponse(data);
  } catch (error) {
    console.error("PATCH /api/nodes/[id] error:", error);
    return internalErrorResponse();
  }
}

/**
 * DELETE /api/nodes/[id]
 * 删除节点（级联删除子节点）
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    // Delete the node (children will be cascade deleted via DB constraint)
    const { error } = await supabase
      .from("nodes")
      .delete()
      .eq("id", nodeId);

    if (error) {
      console.error("Failed to delete node:", error);
      return internalErrorResponse("删除节点失败");
    }

    // Update project's updated_at
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", node.project_id);

    return successResponse({ id: nodeId });
  } catch (error) {
    console.error("DELETE /api/nodes/[id] error:", error);
    return internalErrorResponse();
  }
}
