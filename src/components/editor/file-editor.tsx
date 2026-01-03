"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { CalendarDays, MapPin, FileText } from "lucide-react";
import { EntityAwareEditor } from "./entity-aware-editor";
import { EditorToolbar } from "./editor-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Node, FileMetadata, NodeStatus } from "@/types";
import { useNodes } from "@/lib/hooks";
import { useEntities } from "@/lib/hooks/use-entities";
import { useEditorStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

interface FileEditorProps {
  node: Node;
  projectId: string;
}

export function FileEditor({ node, projectId }: FileEditorProps) {
  const { updateNode, isUpdating } = useNodes(projectId);
  const { entities } = useEntities(projectId);
  const { isDirty, setDirty, setSaving, setLastSavedAt } = useEditorStore();

  const [content, setContent] = useState(node.content || "");
  const [summary, setSummary] = useState(node.summary || "");
  const [showMetadata, setShowMetadata] = useState(false);

  const metadata = node.metadata as FileMetadata;
  const [status, setStatus] = useState<NodeStatus>(metadata?.status || "DRAFT");
  const [timestamp, setTimestamp] = useState(metadata?.timestamp || "");
  const [ignoredEntities, setIgnoredEntities] = useState<string[]>(
    metadata?.ignored_entities || []
  );

  // Reset state when node changes
  useEffect(() => {
    setContent(node.content || "");
    setSummary(node.summary || "");
    const meta = node.metadata as FileMetadata;
    setStatus(meta?.status || "DRAFT");
    setTimestamp(meta?.timestamp || "");
    setIgnoredEntities(meta?.ignored_entities || []);
    setDirty(false);
  }, [node.id, node.content, node.summary, node.metadata, setDirty]);

  // Calculate word count (Chinese characters)
  const calculateWordCount = useCallback((text: string): number => {
    // Remove HTML tags
    const plainText = text.replace(/<[^>]*>/g, "");
    // Count Chinese characters and words
    const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }, []);

  const handleContentUpdate = useCallback((newContent: string) => {
    setContent(newContent);
    setDirty(true);
  }, [setDirty]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const wordCount = calculateWordCount(content);

    try {
      updateNode({
        nodeId: node.id,
        content,
        summary,
        metadata: {
          ...metadata,
          status,
          timestamp: timestamp || null,
          word_count: wordCount,
          ignored_entities: ignoredEntities,
        },
      });
      setDirty(false);
      setLastSavedAt(new Date());
      toast.success("保存成功");
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }, [
    node.id,
    content,
    summary,
    status,
    timestamp,
    metadata,
    ignoredEntities,
    updateNode,
    calculateWordCount,
    setDirty,
    setSaving,
    setLastSavedAt,
  ]);

  const handleAutoSave = useCallback((newContent: string) => {
    setSaving(true);
    const wordCount = calculateWordCount(newContent);

    updateNode({
      nodeId: node.id,
      content: newContent,
      metadata: {
        ...metadata,
        word_count: wordCount,
        ignored_entities: ignoredEntities,
      },
    });

    setDirty(false);
    setLastSavedAt(new Date());
    setSaving(false);
  }, [node.id, metadata, ignoredEntities, updateNode, calculateWordCount, setDirty, setSaving, setLastSavedAt]);

  const handleIgnoreEntity = useCallback((entityName: string) => {
    if (!ignoredEntities.includes(entityName)) {
      const newIgnored = [...ignoredEntities, entityName];
      setIgnoredEntities(newIgnored);
      // Save immediately
      updateNode({
        nodeId: node.id,
        metadata: {
          ...metadata,
          ignored_entities: newIgnored,
        },
      });
      toast.success(`已忽略「${entityName}」的高亮`);
    }
  }, [ignoredEntities, node.id, metadata, updateNode]);

  const handleViewEntityDetails = useCallback(() => {
    // This will be handled by opening the right sidebar
    // For now, just show a toast
    toast.info("请在右侧边栏查看实体详情");
  }, []);

  const wordCount = calculateWordCount(content);
  const { lastSavedAt, isSaving } = useEditorStore();

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
          <h1 className="text-2xl font-semibold mb-6">{node.title}</h1>

          {/* Metadata Toggle */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
              className="text-muted-foreground"
            >
              <FileText className="h-4 w-4 mr-2" />
              {showMetadata ? "隐藏元数据" : "显示元数据"}
            </Button>
          </div>

          {/* Metadata Panel */}
          {showMetadata && (
            <div className="mb-6 p-4 rounded-lg border bg-muted/30 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">状态</Label>
                  <Select
                    value={status}
                    onValueChange={(value: NodeStatus) => {
                      setStatus(value);
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">草稿</SelectItem>
                      <SelectItem value="FINAL">定稿</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Timestamp */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    故事时间
                  </Label>
                  <Input
                    type="datetime-local"
                    value={timestamp}
                    onChange={(e) => {
                      setTimestamp(e.target.value);
                      setDirty(true);
                    }}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">场景摘要</Label>
                <textarea
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="简要描述这个场景的内容..."
                  className={cn(
                    "w-full min-h-[80px] px-3 py-2 text-sm rounded-md border",
                    "bg-background resize-none",
                    "focus:outline-none focus:ring-2 focus:ring-ring"
                  )}
                />
              </div>
            </div>
          )}

          {/* Editor with Entity Highlighting */}
          <EntityAwareEditor
            content={content}
            placeholder="开始写作你的故事..."
            onUpdate={handleContentUpdate}
            onSave={handleAutoSave}
            showWordCount
            autoFocus
            className="min-h-[400px]"
            entities={entities}
            ignoredEntities={ignoredEntities}
            onIgnoreEntity={handleIgnoreEntity}
            onViewEntityDetails={handleViewEntityDetails}
          />

          {/* Word Count Footer */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>{wordCount} 字</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs",
                status === "FINAL"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              )}
            >
              {status === "FINAL" ? "定稿" : "草稿"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
