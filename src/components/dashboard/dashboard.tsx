"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNodes, countWords, countNodesByType } from "@/lib/hooks";
import { Node, FileMetadata } from "@/types";
import { formatRelativeTime } from "@/lib/utils/date";
import {
  BookOpen,
  FileText,
  Folder,
  Users,
  Clock,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface DashboardProps {
  projectId: string;
  projectTitle: string;
}

export function Dashboard({ projectId, projectTitle }: DashboardProps) {
  const { nodes, isLoading } = useNodes(projectId);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!nodes.length) {
      return {
        totalWords: 0,
        folderCount: 0,
        fileCount: 0,
        entityCount: 0, // TODO: Implement when entities are available
        draftCount: 0,
        finalCount: 0,
      };
    }

    const { folders, files } = countNodesByType(nodes);
    const totalWords = countWords(nodes);

    let draftCount = 0;
    let finalCount = 0;

    nodes.forEach((node) => {
      if (node.type === "FILE") {
        const metadata = node.metadata as FileMetadata;
        if (metadata.status === "FINAL") {
          finalCount++;
        } else {
          draftCount++;
        }
      }
    });

    return {
      totalWords,
      folderCount: folders,
      fileCount: files,
      entityCount: 0,
      draftCount,
      finalCount,
    };
  }, [nodes]);

  // Get recently edited nodes
  const recentNodes = useMemo(() => {
    return [...nodes]
      .filter((n) => n.type === "FILE")
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [nodes]);

  // Get writing progress by chapter (only under 正文)
  const chapterProgress = useMemo(() => {
    const manuscriptRoot = nodes.find((n) => {
      const meta = (n.metadata || {}) as { system_root?: boolean; root_kind?: string };
      return n.type === "FOLDER" && !n.parent_id && meta.system_root && meta.root_kind === "MANUSCRIPT";
    });

    if (!manuscriptRoot) return [];

    const chapters = nodes
      .filter((n) => n.type === "FOLDER" && n.parent_id === manuscriptRoot.id)
      .sort((a, b) => a.order.localeCompare(b.order));

    const getDescendantFiles = (parentId: string) => {
      const result: Node[] = [];
      const queue = [parentId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        const children = nodes.filter((n) => n.parent_id === current);
        children.forEach((child) => {
          if (child.type === "FILE") result.push(child);
          else queue.push(child.id);
        });
      }
      return result;
    };

    return chapters.map((chapter) => {
      const files = getDescendantFiles(chapter.id);
      const completed = files.filter((n) => {
        const metadata = n.metadata as FileMetadata;
        return metadata.status === "FINAL";
      }).length;

      return {
        id: chapter.id,
        title: chapter.title,
        total: files.length,
        completed,
      };
    });
  }, [nodes]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{projectTitle}</h1>
        <p className="text-muted-foreground">项目概览</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="总字数"
          value={stats.totalWords.toLocaleString()}
          icon={<BookOpen className="h-4 w-4" />}
        />
        <StatCard
          title="章节"
          value={stats.folderCount.toString()}
          icon={<Folder className="h-4 w-4" />}
        />
        <StatCard
          title="场景"
          value={stats.fileCount.toString()}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="实体"
          value={stats.entityCount.toString()}
          icon={<Users className="h-4 w-4" />}
          subtitle="待实现"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Edits */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              最近编辑
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentNodes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无编辑记录
              </p>
            ) : (
              <ul className="space-y-3">
                {recentNodes.map((node) => (
                  <RecentNodeItem key={node.id} node={node} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Writing Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              写作进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chapterProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无章节
              </p>
            ) : (
              <ul className="space-y-3">
                {chapterProgress.map((chapter) => (
                  <ChapterProgressItem key={chapter.id} chapter={chapter} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">状态概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-sm">草稿: {stats.draftCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm">完成: {stats.finalCount}</span>
            </div>
          </div>
          {stats.fileCount > 0 && (
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${(stats.finalCount / stats.fileCount) * 100}%`,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
}

function StatCard({ title, value, icon, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">
            {title}
            {subtitle && <span className="ml-1">({subtitle})</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentNodeItem({ node }: { node: Node }) {
  const metadata = node.metadata as FileMetadata;
  const wordCount = metadata.word_count || 0;

  return (
    <li className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate">{node.title}</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground shrink-0">
        <span className="text-xs">{wordCount} 字</span>
        <span className="text-xs">{formatRelativeTime(node.updated_at)}</span>
      </div>
    </li>
  );
}

interface ChapterProgress {
  id: string;
  title: string;
  total: number;
  completed: number;
}

function ChapterProgressItem({ chapter }: { chapter: ChapterProgress }) {
  const progress = chapter.total > 0 ? (chapter.completed / chapter.total) * 100 : 0;

  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Folder className="h-4 w-4 text-yellow-500 shrink-0" />
          <span className="truncate">{chapter.title}</span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {chapter.completed}/{chapter.total}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-24 mt-2" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-8 w-16 mt-2" />
              <Skeleton className="h-3 w-12 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
