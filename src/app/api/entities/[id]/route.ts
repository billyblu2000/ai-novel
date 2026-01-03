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

// Validation schema for update
const updateEntitySchema = z.object({
  type: z.enum(["CHARACTER", "LOCATION", "ITEM"]).optional(),
  name: z.string().min(1, "名称不能为空").max(50, "名称不能超过50个字符").optional(),
  aliases: z.array(z.string().max(50)).optional(),
  description: z.string().max(5000, "描述不能超过5000个字符").optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  avatar_url: z.string().url().optional().or(z.null()),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/entities/[id]
 * 获取单个实体详情
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: entityId } = await context.params;
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const { supabase, user } = auth;

    // Fetch entity with project ownership check
    const { data: entity, error } = await supabase
      .from("entities")
      .select(`
        *,
        projects!inner(user_id)
      `)
      .eq("id", entityId)
      .single();

    if (error || !entity) {
      return notFoundResponse("实体不存在");
    }

    // Check ownership (projects is a single object due to !inner)
    const projectData = entity.projects as unknown as { user_id: string };
    if (projectData.user_id !== user.id) {
      return notFoundResponse("实体不存在");
    }

    // Remove projects from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { projects, ...entityData } = entity;
    return successResponse(entityData);
  } catch (error) {
    console.error("GET /api/entities/[id] error:", error);
    return internalErrorResponse();
  }
}

/**
 * PATCH /api/entities/[id]
 * 更新实体
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: entityId } = await context.params;
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const { supabase, user } = auth;

    // Fetch entity with project ownership check
    const { data: existingEntity, error: fetchError } = await supabase
      .from("entities")
      .select(`
        *,
        projects!inner(user_id)
      `)
      .eq("id", entityId)
      .single();

    if (fetchError || !existingEntity) {
      return notFoundResponse("实体不存在");
    }

    // Check ownership (projects is a single object due to !inner)
    const projectData = existingEntity.projects as unknown as { user_id: string };
    if (projectData.user_id !== user.id) {
      return notFoundResponse("实体不存在");
    }

    // Parse and validate request body
    const body = await request.json();
    const result = updateEntitySchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(result.error.issues[0].message);
    }

    const updateData = result.data;

    // If name is being changed, check for duplicates
    if (updateData.name && updateData.name !== existingEntity.name) {
      const { data: duplicateEntity } = await supabase
        .from("entities")
        .select("id")
        .eq("project_id", existingEntity.project_id)
        .eq("name", updateData.name)
        .neq("id", entityId)
        .single();

      if (duplicateEntity) {
        return validationErrorResponse("该名称已被使用");
      }
    }

    // Update the entity
    const { data: entity, error } = await supabase
      .from("entities")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update entity:", error);
      return internalErrorResponse("更新实体失败");
    }

    return successResponse(entity);
  } catch (error) {
    console.error("PATCH /api/entities/[id] error:", error);
    return internalErrorResponse();
  }
}

/**
 * DELETE /api/entities/[id]
 * 删除实体
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: entityId } = await context.params;
    const auth = await getAuthContext();

    if (!auth) {
      return unauthorizedResponse();
    }

    const { supabase, user } = auth;

    // Fetch entity with project ownership check
    const { data: existingEntity, error: fetchError } = await supabase
      .from("entities")
      .select(`
        id,
        projects!inner(user_id)
      `)
      .eq("id", entityId)
      .single();

    if (fetchError || !existingEntity) {
      return notFoundResponse("实体不存在");
    }

    // Check ownership (projects is a single object due to !inner)
    const projectData = existingEntity.projects as unknown as { user_id: string };
    if (projectData.user_id !== user.id) {
      return notFoundResponse("实体不存在");
    }

    // Delete the entity (mentions will be cascade deleted)
    const { error } = await supabase
      .from("entities")
      .delete()
      .eq("id", entityId);

    if (error) {
      console.error("Failed to delete entity:", error);
      return internalErrorResponse("删除实体失败");
    }

    return successResponse({ id: entityId });
  } catch (error) {
    console.error("DELETE /api/entities/[id] error:", error);
    return internalErrorResponse();
  }
}
