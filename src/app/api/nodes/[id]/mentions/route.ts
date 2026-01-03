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

// Validation schema for batch update
const updateMentionsSchema = z.object({
  mentions: z.array(
    z.object({
      entity_id: z.string().uuid(),
      frequency: z.number().int().min(0),
    })
  ),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/nodes/[id]/mentions
 * 获取节点关联的实体
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: nodeId } = await context.params;
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const { supabase, user } = auth;

    // Fetch node with project ownership check
    const { data: node, error: nodeError } = await supabase
      .from("nodes")
      .select(`
        id,
        projects!inner(user_id)
      `)
      .eq("id", nodeId)
      .single();

    if (nodeError || !node) {
      return notFoundResponse("节点不存在");
    }

    // Check ownership (projects is a single object due to !inner)
    const projectData = node.projects as unknown as { user_id: string };
    if (projectData.user_id !== user.id) {
      return notFoundResponse("节点不存在");
    }

    // Fetch mentions with entity details
    const { data: mentions, error } = await supabase
      .from("mentions")
      .select(`
        id,
        node_id,
        entity_id,
        frequency,
        entities(id, name, type, aliases, description, avatar_url)
      `)
      .eq("node_id", nodeId)
      .order("frequency", { ascending: false });

    if (error) {
      console.error("Failed to fetch mentions:", error);
      return internalErrorResponse("获取实体关联失败");
    }

    return successResponse(mentions);
  } catch (error) {
    console.error("GET /api/nodes/[id]/mentions error:", error);
    return internalErrorResponse();
  }
}

/**
 * PUT /api/nodes/[id]/mentions
 * 批量更新节点的 Mentions（全量替换）
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: nodeId } = await context.params;
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const { supabase, user } = auth;

    // Fetch node with project ownership check
    const { data: node, error: nodeError } = await supabase
      .from("nodes")
      .select(`
        id,
        project_id,
        projects!inner(user_id)
      `)
      .eq("id", nodeId)
      .single();

    if (nodeError || !node) {
      return notFoundResponse("节点不存在");
    }

    // Check ownership (projects is a single object due to !inner)
    const projectData = node.projects as unknown as { user_id: string };
    if (projectData.user_id !== user.id) {
      return notFoundResponse("节点不存在");
    }

    // Parse and validate request body
    const body = await request.json();
    const result = updateMentionsSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(result.error.issues[0].message);
    }

    const { mentions } = result.data;

    // Delete all existing mentions for this node
    await supabase.from("mentions").delete().eq("node_id", nodeId);

    // Insert new mentions (if any)
    if (mentions.length > 0) {
      const mentionsToInsert = mentions
        .filter((m) => m.frequency > 0)
        .map((m) => ({
          node_id: nodeId,
          entity_id: m.entity_id,
          frequency: m.frequency,
        }));

      if (mentionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("mentions")
          .insert(mentionsToInsert);

        if (insertError) {
          console.error("Failed to insert mentions:", insertError);
          return internalErrorResponse("更新实体关联失败");
        }
      }
    }

    // Fetch updated mentions
    const { data: updatedMentions, error: fetchError } = await supabase
      .from("mentions")
      .select(`
        id,
        node_id,
        entity_id,
        frequency,
        entities(id, name, type, aliases, description, avatar_url)
      `)
      .eq("node_id", nodeId)
      .order("frequency", { ascending: false });

    if (fetchError) {
      console.error("Failed to fetch updated mentions:", fetchError);
      return internalErrorResponse("获取更新后的实体关联失败");
    }

    return successResponse(updatedMentions);
  } catch (error) {
    console.error("PUT /api/nodes/[id]/mentions error:", error);
    return internalErrorResponse();
  }
}
