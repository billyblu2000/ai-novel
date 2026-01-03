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

    // Ensure system root folders exist (正文 / 笔记). If missing, create and migrate old root nodes.
    const systemRoots = (nodes || []).filter((n) => {
      const meta = (n.metadata || {}) as { system_root?: boolean; root_kind?: string };
      return n.type === "FOLDER" && !n.parent_id && meta.system_root;
    });

    const manuscriptRoot = systemRoots.find((n) => {
      const meta = (n.metadata || {}) as { root_kind?: string };
      return meta.root_kind === "MANUSCRIPT";
    });
    const notesRoot = systemRoots.find((n) => {
      const meta = (n.metadata || {}) as { root_kind?: string };
      return meta.root_kind === "NOTES";
    });

    if (!manuscriptRoot || !notesRoot) {
      // Create roots
      const rootOrder1 = generateKeyBetween(null, null);
      const rootOrder2 = generateKeyBetween(rootOrder1, null);

      const { data: createdRoots, error: createRootsError } = await supabase
        .from("nodes")
        .insert([
          {
            project_id: projectId,
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
            project_id: projectId,
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

      if (createRootsError) {
        console.error("Failed to create system roots:", createRootsError);
        return internalErrorResponse("初始化目录失败");
      }

      const newManuscriptRoot = createdRoots?.find((n) => {
        const meta = (n.metadata || {}) as { root_kind?: string };
        return meta.root_kind === "MANUSCRIPT";
      });

      // Migrate existing old root nodes (excluding the created roots) into 正文
      if (newManuscriptRoot) {
        const oldRootNodes = (nodes || []).filter(
          (n) => !n.parent_id && !(n.metadata as any)?.system_root
        );

        // Re-assign orders under the new parent to keep relative order stable
        const sortedOldRoots = [...oldRootNodes].sort((a, b) =>
          a.order.localeCompare(b.order)
        );

        let prevOrder: string | null = null;
        for (const n of sortedOldRoots) {
          const newOrder = generateKeyBetween(prevOrder, null);
          prevOrder = newOrder;
          await supabase
            .from("nodes")
            .update({ parent_id: newManuscriptRoot.id, order: newOrder })
            .eq("id", n.id);
        }
      }

      // Re-fetch after init/migration
      const { data: nodesAfter, error: refetchError } = await supabase
        .from("nodes")
        .select("*")
        .eq("project_id", projectId)
        .order("order", { ascending: true });

      if (refetchError) {
        console.error("Failed to refetch nodes:", refetchError);
        return internalErrorResponse("获取节点失败");
      }

      return successResponse(nodesAfter);
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
