"use client";

import { Project } from "@/lib/db/schema";
import { useState } from "react";
import { ProjectCard } from "./project-card";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { EditProjectDialog } from "./edit-project-dialog";

interface ProjectGridProps {
  projects: Project[];
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onEdit={setEditProject}
            onDelete={setDeleteProject}
          />
        ))}
      </div>

      {/* 删除确认对话框 */}
      <DeleteProjectDialog
        project={deleteProject}
        open={!!deleteProject}
        onOpenChange={(open) => !open && setDeleteProject(null)}
      />

      {/* 编辑对话框 */}
      <EditProjectDialog
        project={editProject}
        open={!!editProject}
        onOpenChange={(open) => !open && setEditProject(null)}
      />
    </>
  );
}
