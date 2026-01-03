import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, checkProjectOwnership } from "@/lib/api/auth";
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { generateKeyBetween } from "fractional-indexing";

// Validation schemas
const createNodeSchema = z.object({
  parent_id: z.string().uuid().nullable(),
  type: z.enum(["FOLDER", "FILE"]),
  title: z.string().min(1, "标题不能为空").max(100, "标题不能超过100个字符"),
  content: z.string().optional().default(""),
  outline: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  order: z.string().optional(), // If not provided, will be auto-generated
  metadata: z.any().optional().default({}),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/nodes
 * 获取项目下所有节点
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const { supabase, user } = auth;

    // Check project ownership
    const hasAccess = await checkProjectOwnership(supabase, projectId, user.id);
    if (!hasAccess) {
      return notFoundResponse("项目不存在");
    }

    // Fetch all nodes for the project
    const { data: nodes, error } = await supabase
      .from("nodes")
      .select("*")
      .eq("project_id", projectId)
      .order("order", { ascending: true });

    if (error) {
      console.error("Failed to fetch nodes:", error);
      return internalErrorResponse("获取节点失败");
    }

    return successResponse(nodes);
  } catch (error) {
    console.error("GET /api/projects/[id]/nodes error:", error);
    return internalErrorResponse();
  }
}

/**
 * POST /api/projects/[id]/nodes
 * 创建新节点
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const { supabase, user } = auth;

    // Check project ownership
    const hasAccess = await checkProjectOwnership(supabase, projectId, user.id);
    if (!hasAccess) {
      return notFoundResponse("项目不存在");
    }

    // Parse and validate request body
    const body = await request.json();
    const result = createNodeSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(result.error.issues[0].message);
    }

    const { parent_id, type, title, content, outline, summary, metadata } = result.data;
    let { order } = result.data;

    // If order is not provided, generate one
    if (!order) {
      // Get the last sibling's order
      const { data: siblings } = await supabase
        .from("nodes")
        .select("order")
        .eq("project_id", projectId)
        .is("parent_id", parent_id)
        .order("order", { ascending: false })
        .limit(1);

      const lastOrder = siblings?.[0]?.order || null;
      order = generateKeyBetween(lastOrder, null);
    }

    // Set default metadata based on type
    const defaultMetadata = type === "FILE"
      ? { status: "DRAFT", word_count: 0, ignored_entities: [], ...metadata }
      : { collapsed: false, ...metadata };

    // Create the node
    const { data: node, error } = await supabase
      .from("nodes")
      .insert({
        project_id: projectId,
        parent_id,
        type,
        title,
        content,
        outline,
        summary,
        order,
        metadata: defaultMetadata,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create node:", error);
      return internalErrorResponse("创建节点失败");
    }

    // Update project's updated_at
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", projectId);

    return successResponse(node, 201);
  } catch (error) {
    console.error("POST /api/projects/[id]/nodes error:", error);
    return internalErrorResponse();
  }
}
