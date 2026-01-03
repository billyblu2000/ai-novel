import { createClient } from "@/lib/supabase/server";
import { SupabaseClient, User } from "@supabase/supabase-js";

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

/**
 * 获取认证上下文，如果未登录返回 null
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return { supabase, user };
}

/**
 * 检查项目是否存在且属于当前用户
 */
export async function checkProjectOwnership(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  return !!data;
}
