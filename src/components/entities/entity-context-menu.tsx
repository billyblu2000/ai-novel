"use client";

import { Entity } from "@/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { EyeOff, ExternalLink, Info } from "lucide-react";

interface EntityContextMenuProps {
  entity: Entity;
  position: { x: number; y: number };
  visible: boolean;
  onIgnore: (entityName: string) => void;
  onViewDetails: (entity: Entity) => void;
  onClose: () => void;
}

export function EntityContextMenu({
  entity,
  position,
  visible,
  onIgnore,
  onViewDetails,
  onClose,
}: EntityContextMenuProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
    >
      <div className="rounded-md border bg-popover p-1 shadow-md min-w-[160px]">
        <button
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
          onClick={() => {
            onViewDetails(entity);
            onClose();
          }}
        >
          <Info className="h-4 w-4" />
          查看详情
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
          onClick={() => {
            onIgnore(entity.name);
            onClose();
          }}
        >
          <EyeOff className="h-4 w-4" />
          忽略此匹配
        </button>
      </div>
    </div>
  );
}
