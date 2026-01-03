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

// Validation schemas
const createEntitySchema = z.object({
  type: z.enum(["CHARACTER", "LOCATION", "ITEM"]),
  name: z.string().min(1, "名称不能为空").max(50, "名称不能超过50个字符"),
  aliases: z.array(z.string().max(50)).optional().default([]),
  description: z.string().max(5000, "描述不能超过5000个字符").optional().default(""),
  attributes: z.record(z.string(), z.unknown()).optional().default({}),
  avatar_url: z.string().url().optional().or(z.null()),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/entities
 * 获取项目下所有实体
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

    // Fetch all entities for the project
    const { data: entities, error } = await supabase
      .from("entities")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch entities:", error);
      return internalErrorResponse("获取实体失败");
    }

    return successResponse(entities);
  } catch (error) {
    console.error("GET /api/projects/[id]/entities error:", error);
    return internalErrorResponse();
  }
}

/**
 * POST /api/projects/[id]/entities
 * 创建新实体
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

    // Check entity count limit (200 per project)
    const { count } = await supabase
      .from("entities")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (count && count >= 200) {
      return validationErrorResponse("实体数量已达上限（200个），请删除一些不需要的实体");
    }

    // Parse and validate request body
    const body = await request.json();
    const result = createEntitySchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(result.error.issues[0].message);
    }

    const { type, name, aliases, description, attributes, avatar_url } = result.data;

    // Check if entity name already exists in this project
    const { data: existingEntity } = await supabase
      .from("entities")
      .select("id")
      .eq("project_id", projectId)
      .eq("name", name)
      .single();

    if (existingEntity) {
      return validationErrorResponse("该名称已被使用");
    }

    // Create the entity
    const { data: entity, error } = await supabase
      .from("entities")
      .insert({
        project_id: projectId,
        type,
        name,
        aliases,
        description,
        attributes,
        avatar_url: avatar_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create entity:", error);
      return internalErrorResponse("创建实体失败");
    }

    return successResponse(entity, 201);
  } catch (error) {
    console.error("POST /api/projects/[id]/entities error:", error);
    return internalErrorResponse();
  }
}
