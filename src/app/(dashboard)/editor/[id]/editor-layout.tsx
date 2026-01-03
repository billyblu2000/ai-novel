"use client";

import { useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { AppShell } from "@/components/layout";
import { FileTree } from "@/components/binder";
import { Dashboard } from "@/components/dashboard";
import { useEditorStore } from "@/lib/stores";
import { Project, Profile } from "@/types";
import { Header } from "@/components/layout/header";
import { Node } from "@/types";

interface EditorLayoutProps {
  project: Project;
  user: User;
  profile: { nickname: string; avatar_url: string | null } | null;
}

export function EditorLayout({ project, user, profile }: EditorLayoutProps) {
  const { activeNodeId, setActiveProject, setActiveNode } = useEditorStore();

  // Set active project on mount
  useEffect(() => {
    setActiveProject(project.id);
    return () => {
      setActiveProject(null);
      setActiveNode(null);
    };
  }, [project.id, setActiveProject, setActiveNode]);

  const handleNodeSelect = (node: Node) => {
    // For now, just select the node
    // Later, this will open the editor for the node
    console.log("Selected node:", node);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        projectTitle={project.title}
        user={user}
        profile={profile}
      />
      <div className="flex-1 overflow-hidden">
        <AppShell
          leftSidebarContent={
            <FileTree
              projectId={project.id}
              onNodeSelect={handleNodeSelect}
            />
          }
          rightSidebarContent={
            <div className="p-4 text-sm text-muted-foreground">
              实体面板（待实现）
            </div>
          }
        >
          {activeNodeId ? (
            <div className="p-8 text-center text-muted-foreground">
              编辑器（待实现）
              <br />
              当前节点: {activeNodeId}
            </div>
          ) : (
            <Dashboard projectId={project.id} projectTitle={project.title} />
          )}
        </AppShell>
      </div>
    </div>
  );
}
