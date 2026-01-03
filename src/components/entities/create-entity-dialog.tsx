"use client";

import { useState } from "react";
import { EntityType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Users, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreateEntity: (data: {
    projectId: string;
    type: EntityType;
    name: string;
    aliases?: string[];
    description?: string;
    attributes?: Record<string, unknown>;
  }) => void;
}

const ENTITY_TYPES: { value: EntityType; label: string; icon: React.ElementType }[] = [
  { value: "CHARACTER", label: "角色", icon: Users },
  { value: "LOCATION", label: "地点", icon: MapPin },
  { value: "ITEM", label: "物品", icon: Package },
];

export function CreateEntityDialog({
  open,
  onOpenChange,
  projectId,
  onCreateEntity,
}: CreateEntityDialogProps) {
  const [type, setType] = useState<EntityType>("CHARACTER");
  const [name, setName] = useState("");
  const [aliases, setAliases] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [newAlias, setNewAlias] = useState("");
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

  const resetForm = () => {
    setType("CHARACTER");
    setName("");
    setAliases([]);
    setDescription("");
    setAttributes({});
    setNewAlias("");
    setNewAttrKey("");
    setNewAttrValue("");
  };

  const handleAddAlias = () => {
    if (newAlias.trim() && !aliases.includes(newAlias.trim())) {
      setAliases([...aliases, newAlias.trim()]);
      setNewAlias("");
    }
  };

  const handleRemoveAlias = (alias: string) => {
    setAliases(aliases.filter((a) => a !== alias));
  };

  const handleAddAttribute = () => {
    if (newAttrKey.trim() && newAttrValue.trim()) {
      setAttributes({ ...attributes, [newAttrKey.trim()]: newAttrValue.trim() });
      setNewAttrKey("");
      setNewAttrValue("");
    }
  };

  const handleRemoveAttribute = (key: string) => {
    const newAttrs = { ...attributes };
    delete newAttrs[key];
    setAttributes(newAttrs);
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    onCreateEntity({
      projectId,
      type,
      name: name.trim(),
      aliases,
      description: description.trim(),
      attributes,
    });

    resetForm();
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>创建新实体</DialogTitle>
          <DialogDescription>
            添加角色、地点或物品到你的世界观中
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">类型</Label>
            <Select value={type} onValueChange={(v) => setType(v as EntityType)}>
              <SelectTrigger>
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{t.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">名称 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入实体名称"
              maxLength={50}
            />
          </div>

          {/* Aliases */}
          <div className="space-y-2">
            <Label>别名</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {aliases.map((alias) => (
                <Badge
                  key={alias}
                  variant="secondary"
                  className="text-xs gap-1 pr-1"
                >
                  {alias}
                  <button
                    onClick={() => handleRemoveAlias(alias)}
                    className="hover:bg-muted rounded-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAlias())}
                placeholder="添加别名"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddAlias}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述这个实体..."
              className="min-h-[120px] resize-y"
            />
          </div>

          {/* Attributes */}
          <div className="space-y-2">
            <Label>属性</Label>
            <div className="space-y-1.5 mb-2">
              {Object.entries(attributes).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground min-w-[60px]">
                    {key}:
                  </span>
                  <span className="flex-1">{value}</span>
                  <button
                    onClick={() => handleRemoveAttribute(key)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAttrKey}
                onChange={(e) => setNewAttrKey(e.target.value)}
                placeholder="键"
                className="w-24"
              />
              <Input
                value={newAttrValue}
                onChange={(e) => setNewAttrValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAttribute())}
                placeholder="值"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddAttribute}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
