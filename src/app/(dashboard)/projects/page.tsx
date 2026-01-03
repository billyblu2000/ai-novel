import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PenLine } from "lucide-react";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, avatar_url")
    .eq("id", user.id)
    .single();

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
          <Button disabled>
            新建项目
          </Button>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <PenLine className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">还没有项目</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            创建你的第一个小说项目，开始 AI 辅助创作之旅
          </p>
          <Button disabled>创建第一个项目</Button>
        </div>
      </main>
    </div>
  );
}
