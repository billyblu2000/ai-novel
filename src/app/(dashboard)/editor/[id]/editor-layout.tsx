"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { AppShell } from "@/components/layout";
import { FileTree } from "@/components/binder";
import { Dashboard } from "@/components/dashboard";
import { NodeEditor } from "@/components/editor";
import { EntitySidebar } from "@/components/entities";
import { useEditorStore } from "@/lib/stores";
import { useNodes } from "@/lib/hooks";
import { Project, FolderMetadata, Node } from "@/types";
import { Header } from "@/components/layout/header";


interface EditorLayoutProps {
  project: Project;
  user: User;
  profile: { nickname: string; avatar_url: string | null } | null;
}

export function EditorLayout({ project, user, profile }: EditorLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeNodeId, setActiveProject, setActiveNode } = useEditorStore();
  const { nodes } = useNodes(project.id);

  // Get node ID from URL on mount
  const urlNodeId = searchParams.get("node");

  // Set active project on mount and restore node from URL
  useEffect(() => {
    setActiveProject(project.id);
    
    // Restore node from URL if present and valid
    if (urlNodeId && nodes.length > 0) {
      const nodeExists = nodes.some((n) => n.id === urlNodeId);
      if (nodeExists && activeNodeId !== urlNodeId) {
        setActiveNode(urlNodeId);
      }
    }
    
    return () => {
      setActiveProject(null);
      setActiveNode(null);
    };
  }, [project.id, setActiveProject, setActiveNode, urlNodeId, nodes, activeNodeId]);

  // Sync activeNodeId to URL
  useEffect(() => {
    const currentUrlNodeId = searchParams.get("node");
    
    if (activeNodeId && activeNodeId !== currentUrlNodeId) {
      // Update URL with new node ID
      router.replace(`/editor/${project.id}?node=${activeNodeId}`, { scroll: false });
    } else if (!activeNodeId && currentUrlNodeId) {
      // Remove node from URL when deselected
      router.replace(`/editor/${project.id}`, { scroll: false });
    }
  }, [activeNodeId, project.id, router, searchParams]);

  // Find the active node
  const activeNode = useMemo(() => {
    if (!activeNodeId) return null;
    return nodes.find((n) => n.id === activeNodeId) || null;
  }, [activeNodeId, nodes]);

  // Determine if active node is under "笔记" (notes) root folder
  const isNotesMode = useMemo(() => {
    if (!activeNode) return false;
    
    // Find the root folder of the active node
    let currentNode: Node | undefined = activeNode;
    while (currentNode?.parent_id) {
      currentNode = nodes.find((n) => n.id === currentNode!.parent_id);
    }
    
    if (!currentNode) return false;
    
    const metadata = currentNode.metadata as FolderMetadata;
    return metadata?.root_category === "NOTES";
  }, [activeNode, nodes]);

  const handleNodeSelect = useCallback((node: Node) => {
    setActiveNode(node.id);
  }, [setActiveNode]);

  const handleBackToDashboard = useCallback(() => {
    setActiveNode(null);
  }, [setActiveNode]);

  return (
    <div className="flex flex-col h-screen">
      <Header
        projectTitle={project.title}
        user={user}
        profile={profile}
        onBackToDashboard={activeNode ? handleBackToDashboard : undefined}
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
            <EntitySidebar projectId={project.id} />
          }
        >
          {activeNode ? (
            <NodeEditor
              node={activeNode}
              projectId={project.id}
              onNodeSelect={handleNodeSelect}
              isNotesMode={isNotesMode}
            />
          ) : (
            <Dashboard projectId={project.id} projectTitle={project.title} />
          )}
        </AppShell>
      </div>
    </div>
  );
}
