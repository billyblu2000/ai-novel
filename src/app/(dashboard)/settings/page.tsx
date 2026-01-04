import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/auth";
import { PenLine } from "lucide-react";
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

      {/* Settings Content */}
      <SettingsContent />
    </div>
  );
}
