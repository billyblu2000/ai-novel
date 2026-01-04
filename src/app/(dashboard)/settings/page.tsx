import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/auth";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link 
          href="/projects" 
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm">返回项目列表</span>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">设置</span>
        <div className="ml-auto">
          <UserMenu user={user} profile={profile} />
        </div>
      </header>

      {/* Settings Content */}
      <SettingsContent />
    </div>
  );
}
