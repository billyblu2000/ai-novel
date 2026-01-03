"use client";

import { Entity } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntityHoverCardProps {
  entity: Entity;
  position: { x: number; y: number };
  visible: boolean;
}

const ENTITY_TYPE_CONFIG: Record<
  Entity["type"],
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  CHARACTER: {
    label: "角色",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  LOCATION: {
    label: "地点",
    icon: MapPin,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  ITEM: {
    label: "物品",
    icon: Package,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
};

export function EntityHoverCard({
  entity,
  position,
  visible,
}: EntityHoverCardProps) {
  if (!visible) return null;

  const config = ENTITY_TYPE_CONFIG[entity.type];
  const Icon = config.icon;

  // Calculate position to keep card in viewport
  const cardWidth = 280;
  const cardHeight = 150;
  const padding = 10;

  let x = position.x;
  let y = position.y + 25; // Below the highlighted text

  // Adjust if card would go off right edge
  if (typeof window !== "undefined") {
    if (x + cardWidth > window.innerWidth - padding) {
      x = window.innerWidth - cardWidth - padding;
    }
    // Adjust if card would go off bottom edge
    if (y + cardHeight > window.innerHeight - padding) {
      y = position.y - cardHeight - 10; // Above the highlighted text
    }
  }

  return (
    <div
      className={cn(
        "fixed z-50 w-[280px] rounded-lg border bg-popover p-3 shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
      style={{ left: x, top: y }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={entity.avatar_url || undefined} />
          <AvatarFallback className={cn(config.bgColor, config.color)}>
            <Icon className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{entity.name}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {config.label}
            </Badge>
          </div>
          {entity.aliases.length > 0 && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              别名: {entity.aliases.slice(0, 3).join(", ")}
              {entity.aliases.length > 3 && "..."}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {entity.description && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
          {entity.description}
        </p>
      )}

      {/* Attributes Preview */}
      {Object.keys(entity.attributes).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(entity.attributes)
            .slice(0, 3)
            .map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-[10px]">
                {key}: {String(value)}
              </Badge>
            ))}
          {Object.keys(entity.attributes).length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{Object.keys(entity.attributes).length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
