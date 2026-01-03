import { NextRequest } from "next/server";
import { z } from "zod/v4";
import {
  getAuthContext,
  checkProjectOwnership,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api";

const updateProjectSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题最多100个字符").optional(),
  cover_image: z.string().url().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - 获取单个项目
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if (!auth) return unauthorizedResponse();

    const { data: project, error } = await auth.supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .single();

    if (error || !project) {
      return notFoundResponse("项目不存在");
    }

    return successResponse(project);
  } catch (error) {
    console.error("获取项目失败:", error);
    return internalErrorResponse("获取项目失败");
  }
}

// PATCH /api/projects/[id] - 更新项目
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if (!auth) return unauthorizedResponse();

    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message || "参数验证失败");
    }

    const exists = await checkProjectOwnership(auth.supabase, id, auth.user.id);
    if (!exists) return notFoundResponse("项目不存在");

    const { data: project, error } = await auth.supabase
      .from("projects")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return successResponse(project);
  } catch (error) {
    console.error("更新项目失败:", error);
    return internalErrorResponse("更新项目失败");
  }
}

// DELETE /api/projects/[id] - 删除项目
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if (!auth) return unauthorizedResponse();

    const exists = await checkProjectOwnership(auth.supabase, id, auth.user.id);
    if (!exists) return notFoundResponse("项目不存在");

    const { error } = await auth.supabase.from("projects").delete().eq("id", id);

    if (error) throw error;

    return successResponse(null);
  } catch (error) {
    console.error("删除项目失败:", error);
    return internalErrorResponse("删除项目失败");
  }
}
