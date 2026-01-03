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

    const { data: project, error } = await auth.supabase
      .from("projects")
      .insert({
        user_id: auth.user.id,
        title: parsed.data.title,
      })
      .select()
      .single();

    if (error) throw error;

    // Create system root folders and an initial structure
    try {
      const rootOrder1 = generateKeyBetween(null, null);
      const rootOrder2 = generateKeyBetween(rootOrder1, null);

      const { data: roots, error: rootError } = await auth.supabase
        .from("nodes")
        .insert([
          {
            project_id: project.id,
            parent_id: null,
            type: "FOLDER",
            title: "正文",
            content: "",
            outline: "",
            summary: "",
            order: rootOrder1,
            metadata: { collapsed: false, system_root: true, root_kind: "MANUSCRIPT" },
          },
          {
            project_id: project.id,
            parent_id: null,
            type: "FOLDER",
            title: "笔记",
            content: "",
            outline: "",
            summary: "",
            order: rootOrder2,
            metadata: { collapsed: false, system_root: true, root_kind: "NOTES" },
          },
        ])
        .select();

      if (rootError) throw rootError;

      const manuscriptRoot = roots?.find((n) => (n.metadata as any)?.root_kind === "MANUSCRIPT");

      // Create a starter chapter + scene under 正文 (optional but improves first-run UX)
      if (manuscriptRoot) {
        const chapterOrder = generateKeyBetween(null, null);
        const { data: chapter, error: chapterError } = await auth.supabase
          .from("nodes")
          .insert({
            project_id: project.id,
            parent_id: manuscriptRoot.id,
            type: "FOLDER",
            title: "第一章",
            content: "",
            outline: "",
            summary: "",
            order: chapterOrder,
            metadata: { collapsed: false },
          })
          .select()
          .single();

        if (chapterError) throw chapterError;

        await auth.supabase.from("nodes").insert({
          project_id: project.id,
          parent_id: chapter.id,
          type: "FILE",
          title: "场景 1",
          content: "",
          outline: "",
          summary: "",
          order: generateKeyBetween(null, null),
          metadata: { status: "DRAFT", word_count: 0, ignored_entities: [] },
        });
      }
    } catch (e) {
      // If init fails, still return the project; the editor GET will attempt to self-heal.
      console.error("初始化项目目录失败:", e);
    }

    return successResponse(project, 201);
  } catch (error) {
    console.error("创建项目失败:", error);
    return internalErrorResponse("创建项目失败");
  }
}
