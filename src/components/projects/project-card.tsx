"use client";

import { Project } from "@/lib/db/schema";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, MoreVertical, Pencil, Trash2, Calendar } from "lucide-react";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <Card className="group relative flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* 封面图 */}
      <Link href={`/editor/${project.id}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          {project.coverImage ? (
            <img
              src={project.coverImage}
              alt={project.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
        </div>
      </Link>

      {/* 操作菜单 */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background/80 backdrop-blur"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(project)}>
              <Pencil className="mr-2 h-4 w-4" />
              编辑信息
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete?.(project)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除项目
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 标题和信息 */}
      <CardHeader className="flex-1 p-4 pb-2">
        <Link
          href={`/editor/${project.id}`}
          className="line-clamp-2 text-lg font-semibold hover:underline"
        >
          {project.title}
        </Link>
      </CardHeader>

      <CardFooter className="p-4 pt-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatRelativeTime(project.updatedAt)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
