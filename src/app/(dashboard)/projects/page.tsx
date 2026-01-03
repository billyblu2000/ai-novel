import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/auth";
import { PenLine } from "lucide-react";
import Link from "next/link";
import {
  ProjectGrid,
  CreateProjectDialog,
  EmptyState,
} from "@/components/projects";
import { Project } from "@/lib/db/schema";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 获取用户信息
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, avatar_url")
    .eq("id", user.id)
    .single();

  // 获取项目列表
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const projectList = (projects || []) as Project[];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/projects" className="flex items-center space-x-2">
            <PenLine className="h-5 w-5" />
            <span className="font-semibold">AI Novel Studio</span>
          </Link>
          <UserMenu user={user} profile={profile} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">我的项目</h1>
            <p className="text-sm text-muted-foreground">
              管理你的小说创作项目
            </p>
          </div>
          {projectList.length > 0 && <CreateProjectDialog />}
        </div>

        {/* 项目列表或空状态 */}
        {projectList.length > 0 ? (
          <ProjectGrid projects={projectList} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
