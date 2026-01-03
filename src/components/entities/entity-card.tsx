"use client";

import { useState } from "react";
import { Entity, EntityType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EntityEditForm } from "./entity-edit-form";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Users,
  MapPin,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EntityCardProps {
  entity: Entity;
  frequency?: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (data: {
    entityId: string;
    name?: string;
    aliases?: string[];
    description?: string;
    attributes?: Record<string, unknown>;
    avatar_url?: string | null;
  }) => void;
  onDelete: (entityId: string) => void;
}

const ENTITY_TYPE_CONFIG: Record<
  EntityType,
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

export function EntityCard({
  entity,
  frequency,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
}: EntityCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const config = ENTITY_TYPE_CONFIG[entity.type];
  const Icon = config.icon;

  const handleSave = (data: {
    name: string;
    aliases: string[];
    description: string;
    attributes: Record<string, unknown>;
  }) => {
    onUpdate({
      entityId: entity.id,
      ...data,
    });
    setIsEditing(false);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="rounded-lg border bg-card">
        {/* Card Header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors">
            {/* Avatar */}
            <Avatar className="h-8 w-8">
              <AvatarImage src={entity.avatar_url || undefined} />
              <AvatarFallback className={cn(config.bgColor, config.color)}>
                <Icon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {entity.name}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {config.label}
                </Badge>
              </div>
              {entity.aliases.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  别名: {entity.aliases.join(", ")}
                </p>
              )}
            </div>

            {/* Frequency Badge (if provided) */}
            {frequency !== undefined && (
              <Badge variant="outline" className="text-[10px]">
                {frequency}次
              </Badge>
            )}

            {/* Expand Icon */}
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="border-t px-3 py-3 space-y-3">
            {isEditing ? (
              <EntityEditForm
                entity={entity}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                {/* Description */}
                {entity.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">描述</p>
                    <p className="text-sm whitespace-pre-wrap">
                      {entity.description}
                    </p>
                  </div>
                )}

                {/* Attributes */}
                {Object.keys(entity.attributes).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">属性</p>
                    <div className="space-y-1">
                      {Object.entries(entity.attributes).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center text-sm gap-2"
                        >
                          <span className="text-muted-foreground">{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    编辑
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        删除
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除实体「{entity.name}」吗？此操作无法撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(entity.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
