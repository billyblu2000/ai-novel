"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Folder,
  User,
  MapPin,
  Package,
  Search,
  Check,
} from "lucide-react";
import type { Node, Entity } from "@/types";
import type { UserContextItem } from "@/lib/ai/types";

interface AIContextSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node[];
  entities: Entity[];
}

// 实体类型配置
const ENTITY_TYPE_CONFIG = {
  CHARACTER: { label: "角色", icon: User, color: "text-blue-500" },
  LOCATION: { label: "地点", icon: MapPin, color: "text-emerald-500" },
  ITEM: { label: "物品", icon: Package, color: "text-amber-500" },
} as const;

/**
 * AI 上下文选择器
 * 支持选择节点和实体作为上下文
 */
export function AIContextSelector({
  open,
  onOpenChange,
  nodes,
  entities,
}: AIContextSelectorProps) {
  const [activeTab, setActiveTab] = useState<"nodes" | "entities">("nodes");
  const [searchQuery, setSearchQuery] = useState("");
  const { pendingContexts, addPendingContext } = useAIStore();

  // 过滤节点
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes;
    const query = searchQuery.toLowerCase();
    return nodes.filter(
      (node) =>
        node.title.toLowerCase().includes(query) ||
        node.content.toLowerCase().includes(query)
    );
  }, [nodes, searchQuery]);

  // 过滤实体
  const filteredEntities = useMemo(() => {
    if (!searchQuery) return entities;
    const query = searchQuery.toLowerCase();
    return entities.filter(
      (entity) =>
        entity.name.toLowerCase().includes(query) ||
        entity.aliases.some((alias) => alias.toLowerCase().includes(query)) ||
        entity.description.toLowerCase().includes(query)
    );
  }, [entities, searchQuery]);

  // 检查节点是否已添加
  const isNodeAdded = (nodeId: string) => {
    return pendingContexts.some(
      (ctx) => ctx.type === "node" && ctx.nodeId === nodeId
    );
  };

  // 检查实体是否已添加
  const isEntityAdded = (entityId: string) => {
    return pendingContexts.some(
      (ctx) => ctx.type === "entity" && ctx.entityId === entityId
    );
  };

  // 添加节点上下文
  const handleAddNode = (node: Node) => {
    if (isNodeAdded(node.id)) return;

    // 获取子节点名称（仅对 FOLDER 类型）
    const childrenNames =
      node.type === "FOLDER"
        ? nodes
            .filter((n) => n.parent_id === node.id)
            .sort((a, b) => a.order.localeCompare(b.order))
            .map((n) => `${n.type === "FOLDER" ? "📁" : "📄"} ${n.title}`)
        : undefined;

    // 获取故事时间（仅对 FILE 类型）
    const timestamp =
      node.type === "FILE"
        ? (node.metadata as { timestamp?: string | null }).timestamp
        : undefined;

    const contextItem: UserContextItem = {
      type: "node",
      nodeId: node.id,
      title: node.title,
      nodeType: node.type,
      content: node.content || "",
      summary: node.summary || "",
      timestamp,
      childrenNames,
    };
    addPendingContext(contextItem);
  };

  // 添加实体上下文
  const handleAddEntity = (entity: Entity) => {
    if (isEntityAdded(entity.id)) return;

    const contextItem: UserContextItem = {
      type: "entity",
      entityId: entity.id,
      entityType: entity.type,
      name: entity.name,
      aliases: entity.aliases || [],
      description: entity.description || "",
      attributes: entity.attributes || {},
    };
    addPendingContext(contextItem);
  };

  // 构建节点树结构用于显示
  const nodeTree = useMemo(() => {
    const nodeMap = new Map<string | null, Node[]>();

    // 按 parent_id 分组
    filteredNodes.forEach((node) => {
      const parentId = node.parent_id;
      if (!nodeMap.has(parentId)) {
        nodeMap.set(parentId, []);
      }
      nodeMap.get(parentId)!.push(node);
    });

    // 排序
    nodeMap.forEach((children) => {
      children.sort((a, b) => a.order.localeCompare(b.order));
    });

    return nodeMap;
  }, [filteredNodes]);

  // 递归渲染节点
  const renderNodes = (parentId: string | null, depth: number = 0) => {
    const children = nodeTree.get(parentId) || [];
    if (children.length === 0) return null;

    return children.map((node) => {
      const isAdded = isNodeAdded(node.id);
      const hasChildren = nodeTree.has(node.id);
      const isFolder = node.type === "FOLDER";

      return (
        <div key={node.id}>
          <button
            onClick={() => handleAddNode(node)}
            disabled={isAdded}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-left",
              "hover:bg-muted/50 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isAdded && "bg-violet-500/10"
            )}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {isFolder ? (
              <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
            ) : (
              <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}
            <span className="flex-1 truncate text-sm">{node.title}</span>
            {isAdded && <Check className="h-4 w-4 text-violet-500 flex-shrink-0" />}
          </button>
          {hasChildren && renderNodes(node.id, depth + 1)}
        </div>
      );
    });
  };

  // 按类型分组实体
  const groupedEntities = useMemo(() => {
    const groups: Record<Entity["type"], Entity[]> = {
      CHARACTER: [],
      LOCATION: [],
      ITEM: [],
    };
    filteredEntities.forEach((entity) => {
      groups[entity.type].push(entity);
    });
    return groups;
  }, [filteredEntities]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>添加参考内容</DialogTitle>
        </DialogHeader>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索节点或实体..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 标签页 */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "nodes" | "entities")}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nodes" className="gap-1.5">
              <FileText className="h-4 w-4" />
              节点
              <span className="text-xs text-muted-foreground">
                ({filteredNodes.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="entities" className="gap-1.5">
              <User className="h-4 w-4" />
              实体
              <span className="text-xs text-muted-foreground">
                ({filteredEntities.length})
              </span>
            </TabsTrigger>
          </TabsList>

          {/* 节点列表 */}
          <TabsContent
            value="nodes"
            className="flex-1 overflow-y-auto border rounded-md mt-2"
          >
            {filteredNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? "未找到匹配的节点" : "暂无节点"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {renderNodes(null)}
              </div>
            )}
          </TabsContent>

          {/* 实体列表 */}
          <TabsContent
            value="entities"
            className="flex-1 overflow-y-auto border rounded-md mt-2"
          >
            {filteredEntities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? "未找到匹配的实体" : "暂无实体"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {(Object.keys(ENTITY_TYPE_CONFIG) as Entity["type"][]).map(
                  (type) => {
                    const typeEntities = groupedEntities[type];
                    if (typeEntities.length === 0) return null;

                    const config = ENTITY_TYPE_CONFIG[type];
                    const Icon = config.icon;

                    return (
                      <div key={type}>
                        {/* 类型标题 */}
                        <div className="px-3 py-2 bg-muted/30 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Icon className={cn("h-3.5 w-3.5", config.color)} />
                          {config.label}
                          <span>({typeEntities.length})</span>
                        </div>
                        {/* 实体列表 */}
                        {typeEntities.map((entity) => {
                          const isAdded = isEntityAdded(entity.id);
                          return (
                            <button
                              key={entity.id}
                              onClick={() => handleAddEntity(entity)}
                              disabled={isAdded}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 text-left",
                                "hover:bg-muted/50 transition-colors",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                isAdded && "bg-violet-500/10"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-4 w-4 flex-shrink-0",
                                  config.color
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm truncate">
                                  {entity.name}
                                </div>
                                {entity.description && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {entity.description}
                                  </div>
                                )}
                              </div>
                              {isAdded && (
                                <Check className="h-4 w-4 text-violet-500 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 已选数量提示 */}
        {pendingContexts.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            已添加 {pendingContexts.length} 个参考内容
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
