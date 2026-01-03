import { NextRequest } from "next/server";
import { z } from "zod/v4";
import {
  getAuthContext,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/api";
import { generateKeyBetween } from "fractional-indexing";

const createProjectSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题最多100个字符"),
});

// GET /api/projects - 获取当前用户的所有项目
export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorizedResponse();

    const { data: projects, error } = await auth.supabase
      .from("projects")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return successResponse(projects);
  } catch (error) {
    console.error("获取项目列表失败:", error);
    return internalErrorResponse("获取项目列表失败");
  }
}

// POST /api/projects - 创建新项目
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return unauthorizedResponse();

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message || "参数验证失败");
    }

    // Create project
    const { data: project, error } = await auth.supabase
      .from("projects")
      .insert({
        user_id: auth.user.id,
        title: parsed.data.title,
      })
      .select()
      .single();

    if (error) throw error;

    // Create default root folders: 正文 and 笔记
    const rootFolders = [
      {
        project_id: project.id,
        parent_id: null,
        type: "FOLDER",
        title: "正文",
        content: "",
        outline: "",
        summary: "",
        order: generateKeyBetween(null, null),
        metadata: { collapsed: false, root_category: "MANUSCRIPT" },
      },
      {
        project_id: project.id,
        parent_id: null,
        type: "FOLDER",
        title: "笔记",
        content: "",
        outline: "",
        summary: "",
        order: generateKeyBetween(generateKeyBetween(null, null), null),
        metadata: { collapsed: false, root_category: "NOTES" },
      },
    ];

    const { error: nodesError } = await auth.supabase
      .from("nodes")
      .insert(rootFolders);

    if (nodesError) {
      console.error("创建默认文件夹失败:", nodesError);
      // Don't fail the whole request, project is still created
    }

    return successResponse(project, 201);
  } catch (error) {
    console.error("创建项目失败:", error);
    return internalErrorResponse("创建项目失败");
  }
}
