"use client";

import { useEffect, useCallback, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { AppShell } from "@/components/layout";
import { FileTree } from "@/components/binder";
import { Dashboard } from "@/components/dashboard";
import { NodeEditor } from "@/components/editor";
import { useEditorStore } from "@/lib/stores";
import { useNodes } from "@/lib/hooks";
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
  const { nodes } = useNodes(project.id);

  // Set active project on mount
  useEffect(() => {
    setActiveProject(project.id);
    return () => {
      setActiveProject(null);
      setActiveNode(null);
    };
  }, [project.id, setActiveProject, setActiveNode]);

  // Find the active node
  const activeNode = useMemo(() => {
    if (!activeNodeId) return null;
    return nodes.find((n) => n.id === activeNodeId) || null;
  }, [activeNodeId, nodes]);

  const handleNodeSelect = useCallback((node: Node) => {
    setActiveNode(node.id);
  }, [setActiveNode]);

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
          {activeNode ? (
            <NodeEditor
              node={activeNode}
              projectId={project.id}
              onNodeSelect={handleNodeSelect}
            />
          ) : (
            <Dashboard projectId={project.id} projectTitle={project.title} />
          )}
        </AppShell>
      </div>
    </div>
  );
}
