import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditorLayout } from "./editor-layout";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get project with ownership check
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <EditorLayout
      project={project}
      user={user}
      profile={profile}
    />
  );
}
