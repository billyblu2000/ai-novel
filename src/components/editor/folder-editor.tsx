"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { FileText, FolderOpen, ChevronRight, Plus } from "lucide-react";
import { TiptapEditor } from "./tiptap-editor";
import { EditorToolbar } from "./editor-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Node, FolderMetadata, FileMetadata } from "@/types";
import { useNodes, buildTree, TreeNode } from "@/lib/hooks";
import { useEditorStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

interface FolderEditorProps {
  node: Node;
  projectId: string;
  onNodeSelect?: (node: Node) => void;
}

export function FolderEditor({ node, projectId, onNodeSelect }: FolderEditorProps) {
  const { nodes, updateNode, createNode, isUpdating, isCreating } = useNodes(projectId);
  const { isDirty, setDirty, setSaving, setLastSavedAt, isSaving, lastSavedAt } = useEditorStore();

  const [outline, setOutline] = useState(node.outline || "");

  // Reset state when node changes
  useEffect(() => {
    setOutline(node.outline || "");
    setDirty(false);
  }, [node.id, node.outline, setDirty]);

  // Get children of this folder
  const children = nodes
    .filter((n) => n.parent_id === node.id)
    .sort((a, b) => a.order.localeCompare(b.order));

  const handleOutlineUpdate = useCallback((newOutline: string) => {
    setOutline(newOutline);
    setDirty(true);
  }, [setDirty]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      updateNode({
        nodeId: node.id,
        outline,
      });
      setDirty(false);
      setLastSavedAt(new Date());
      toast.success("保存成功");
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }, [node.id, outline, updateNode, setDirty, setSaving, setLastSavedAt]);

  const handleAutoSave = useCallback((newOutline: string) => {
    setSaving(true);
    updateNode({
      nodeId: node.id,
      outline: newOutline,
    });
    setDirty(false);
    setLastSavedAt(new Date());
    setSaving(false);
  }, [node.id, updateNode, setDirty, setSaving, setLastSavedAt]);

  const handleCreateChild = useCallback((type: "FOLDER" | "FILE") => {
    createNode({
      projectId,
      parentId: node.id,
      type,
      title: type === "FOLDER" ? "新章节" : "新场景",
    });
  }, [projectId, node.id, createNode]);

  const handleChildClick = useCallback((child: Node) => {
    onNodeSelect?.(child);
  }, [onNodeSelect]);

  // Calculate stats for children
  const getChildStats = (child: Node) => {
    if (child.type === "FILE") {
      const meta = child.metadata as FileMetadata;
      return {
        wordCount: meta?.word_count || 0,
        status: meta?.status || "DRAFT",
      };
    }
    // For folders, count all descendant files
    const descendants = getDescendantFiles(child.id);
    const totalWords = descendants.reduce((sum, n) => {
      const meta = n.metadata as FileMetadata;
      return sum + (meta?.word_count || 0);
    }, 0);
    return {
      wordCount: totalWords,
      childCount: descendants.length,
    };
  };

  const getDescendantFiles = (parentId: string): Node[] => {
    const result: Node[] = [];
    const queue = [parentId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = nodes.filter((n) => n.parent_id === current);
      children.forEach((child) => {
        if (child.type === "FILE") {
          result.push(child);
        } else {
          queue.push(child.id);
        }
      });
    }
    return result;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <EditorToolbar
        isDirty={isDirty}
        isSaving={isSaving || isUpdating}
        lastSavedAt={lastSavedAt}
        onSave={handleSave}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto py-8 px-6">
          {/* Title */}
          <div className="flex items-center gap-2 mb-6">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">{node.title}</h1>
          </div>

          {/* Outline Section */}
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              章节大纲
            </h2>
            <TiptapEditor
              content={outline}
              placeholder="在这里编写章节大纲和写作计划..."
              onUpdate={handleOutlineUpdate}
              onSave={handleAutoSave}
              className="min-h-[200px] p-4 rounded-lg border bg-muted/30"
            />
          </div>

          {/* Children Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">子内容</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateChild("FOLDER")}
                  disabled={isCreating}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  新建章节
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateChild("FILE")}
                  disabled={isCreating}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  新建场景
                </Button>
              </div>
            </div>

            {children.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>暂无子内容</p>
                <p className="text-sm mt-1">点击上方按钮创建新的章节或场景</p>
              </div>
            ) : (
              <div className="space-y-2">
                {children.map((child) => {
                  const stats = getChildStats(child);
                  const isFile = child.type === "FILE";
                  const fileStats = stats as { wordCount: number; status?: string };
                  const folderStats = stats as { wordCount: number; childCount?: number };

                  return (
                    <Card
                      key={child.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/50",
                        "border-l-4",
                        isFile
                          ? fileStats.status === "FINAL"
                            ? "border-l-green-500"
                            : "border-l-yellow-500"
                          : "border-l-blue-500"
                      )}
                      onClick={() => handleChildClick(child)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isFile ? (
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <FolderOpen className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{child.title}</p>
                            {child.summary && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {child.summary}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {fileStats.wordCount} 字
                            {!isFile && folderStats.childCount !== undefined && (
                              <span className="ml-2">
                                · {folderStats.childCount} 个场景
                              </span>
                            )}
                          </span>
                          {isFile && (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-xs",
                                fileStats.status === "FINAL"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              )}
                            >
                              {fileStats.status === "FINAL" ? "定稿" : "草稿"}
                            </span>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
