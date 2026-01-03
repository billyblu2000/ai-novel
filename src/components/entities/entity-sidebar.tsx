"use client";

import { useState, useMemo } from "react";
import { Entity, EntityType } from "@/types";
import { useEntities, useMentions, groupEntitiesByType } from "@/lib/hooks/use-entities";
import { useEditorStore } from "@/lib/stores";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { EntityCard } from "./entity-card";
import { CreateEntityDialog } from "./create-entity-dialog";
import { Plus, Search, Users, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntitySidebarProps {
  projectId: string;
}

type SidebarMode = "context" | "browse";

const ENTITY_TYPE_CONFIG: Record<
  EntityType,
  { label: string; icon: React.ElementType; color: string }
> = {
  CHARACTER: { label: "角色", icon: Users, color: "text-blue-500" },
  LOCATION: { label: "地点", icon: MapPin, color: "text-green-500" },
  ITEM: { label: "物品", icon: Package, color: "text-amber-500" },
};

export function EntitySidebar({ projectId }: EntitySidebarProps) {
  const [mode, setMode] = useState<SidebarMode>("context");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null);

  const { activeNodeId } = useEditorStore();
  const { entities, isLoading, createEntity, updateEntity, deleteEntity } =
    useEntities(projectId);
  const { mentions } = useMentions(activeNodeId);

  // Filter entities based on search query
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;
    const query = searchQuery.toLowerCase();
    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.aliases.some((a) => a.toLowerCase().includes(query)) ||
        e.description.toLowerCase().includes(query)
    );
  }, [entities, searchQuery]);

  // Group entities by type for browse mode
  const groupedEntities = useMemo(
    () => groupEntitiesByType(filteredEntities),
    [filteredEntities]
  );

  // Get context entities (entities mentioned in current node)
  const contextEntities = useMemo(() => {
    if (!mentions.length) return [];
    const entityIds = new Set(mentions.map((m) => m.entity_id));
    return entities
      .filter((e) => entityIds.has(e.id))
      .sort((a, b) => {
        const freqA = mentions.find((m) => m.entity_id === a.id)?.frequency || 0;
        const freqB = mentions.find((m) => m.entity_id === b.id)?.frequency || 0;
        return freqB - freqA;
      });
  }, [entities, mentions]);

  const handleToggleExpand = (entityId: string) => {
    setExpandedEntityId((prev) => (prev === entityId ? null : entityId));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">实体管理</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Mode Tabs */}
      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as SidebarMode)}
        className="flex-1 flex flex-col"
      >
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-2">
          <TabsTrigger value="context" className="text-xs">
            当前场景
          </TabsTrigger>
          <TabsTrigger value="browse" className="text-xs">
            全部实体
          </TabsTrigger>
        </TabsList>

        {/* Search (only in browse mode) */}
        {mode === "browse" && (
          <div className="px-4 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索实体..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        )}

        {/* Context Mode */}
        <TabsContent value="context" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {!activeNodeId ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  请先选择一个场景
                </p>
              ) : contextEntities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  当前场景暂无关联实体
                </p>
              ) : (
                contextEntities.map((entity) => {
                  const mention = mentions.find(
                    (m) => m.entity_id === entity.id
                  );
                  return (
                    <EntityCard
                      key={entity.id}
                      entity={entity}
                      frequency={mention?.frequency}
                      isExpanded={expandedEntityId === entity.id}
                      onToggleExpand={() => handleToggleExpand(entity.id)}
                      onUpdate={updateEntity}
                      onDelete={deleteEntity}
                    />
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Browse Mode */}
        <TabsContent value="browse" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-md bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredEntities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  {searchQuery ? "未找到匹配的实体" : "暂无实体，点击 + 创建"}
                </p>
              ) : (
                (Object.keys(ENTITY_TYPE_CONFIG) as EntityType[]).map((type) => {
                  const typeEntities = groupedEntities[type];
                  if (typeEntities.length === 0) return null;

                  const config = ENTITY_TYPE_CONFIG[type];
                  const Icon = config.icon;

                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn("h-4 w-4", config.color)} />
                        <span className="text-xs font-medium text-muted-foreground">
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({typeEntities.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {typeEntities.map((entity) => (
                          <EntityCard
                            key={entity.id}
                            entity={entity}
                            isExpanded={expandedEntityId === entity.id}
                            onToggleExpand={() => handleToggleExpand(entity.id)}
                            onUpdate={updateEntity}
                            onDelete={deleteEntity}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Create Entity Dialog */}
      <CreateEntityDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projectId={projectId}
        onCreateEntity={createEntity}
      />
    </div>
  );
}
