"use client";

import { useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { AppShell } from "@/components/layout";
import { FileTree } from "@/components/binder";
import { Dashboard } from "@/components/dashboard";
import { NodeEditor } from "@/components/editor";
import { EntitySidebar } from "@/components/entities";
import { useEditorStore } from "@/lib/stores";
import { useNodes } from "@/lib/hooks";
import { Project } from "@/types";
import { Header } from "@/components/layout/header";
import { Node } from "@/types";
import { Button } from "@/components/ui/button";

interface EditorLayoutProps {
  project: Project;
  user: User;
  profile: { nickname: string; avatar_url: string | null } | null;
}

export function EditorLayout({ project, user, profile }: EditorLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  // Restore selected node from URL on refresh
  useEffect(() => {
    const nodeIdFromUrl = searchParams.get("node");
    if (!nodeIdFromUrl) return;
    if (!nodes.length) return;

    const exists = nodes.some((n) => n.id === nodeIdFromUrl);
    if (exists) {
      setActiveNode(nodeIdFromUrl);
    }
  }, [searchParams, nodes, setActiveNode]);

  const setNodeInUrl = useCallback(
    (nodeId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nodeId) params.set("node", nodeId);
      else params.delete("node");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Find the active node
  const activeNode = useMemo(() => {
    if (!activeNodeId) return null;
    return nodes.find((n) => n.id === activeNodeId) || null;
  }, [activeNodeId, nodes]);

  const handleNodeSelect = useCallback(
    (node: Node) => {
      setActiveNode(node.id);
      setNodeInUrl(node.id);
    },
    [setActiveNode, setNodeInUrl]
  );

  const handleGoOverview = useCallback(() => {
    setActiveNode(null);
    setNodeInUrl(null);
  }, [setActiveNode, setNodeInUrl]);

  return (
    <div className="flex flex-col h-screen">
      <Header
        projectTitle={project.title}
        user={user}
        profile={profile}
        actions={
          <Button variant="ghost" size="sm" onClick={handleGoOverview}>
            项目概览
          </Button>
        }
      />
      <div className="flex-1 overflow-hidden">
        <AppShell
          leftSidebarContent={
            <FileTree projectId={project.id} onNodeSelect={handleNodeSelect} />
          }
          rightSidebarContent={<EntitySidebar projectId={project.id} />}
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
