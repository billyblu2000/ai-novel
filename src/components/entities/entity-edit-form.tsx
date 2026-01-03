"use client";

import { useState } from "react";
import { Entity } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface EntityEditFormProps {
  entity: Entity;
  onSave: (data: {
    name: string;
    aliases: string[];
    description: string;
    attributes: Record<string, unknown>;
  }) => void;
  onCancel: () => void;
}

export function EntityEditForm({
  entity,
  onSave,
  onCancel,
}: EntityEditFormProps) {
  const [name, setName] = useState(entity.name);
  const [aliases, setAliases] = useState<string[]>(entity.aliases);
  const [description, setDescription] = useState(entity.description);
  const [attributes, setAttributes] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(entity.attributes).map(([k, v]) => [k, String(v)])
    )
  );
  const [newAlias, setNewAlias] = useState("");
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

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

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      aliases,
      description: description.trim(),
      attributes,
    });
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs">
          名称
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm"
          placeholder="实体名称"
        />
      </div>

      {/* Aliases */}
      <div className="space-y-1.5">
        <Label className="text-xs">别名</Label>
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
            onKeyDown={(e) => e.key === "Enter" && handleAddAlias()}
            className="h-8 text-sm flex-1"
            placeholder="添加别名"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleAddAlias}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs">
          描述
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-sm min-h-[80px] resize-none"
          placeholder="实体描述..."
        />
      </div>

      {/* Attributes */}
      <div className="space-y-1.5">
        <Label className="text-xs">属性</Label>
        <div className="space-y-1.5 mb-2">
          {Object.entries(attributes).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground min-w-[60px]">{key}:</span>
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
            className="h-8 text-sm w-24"
            placeholder="键"
          />
          <Input
            value={newAttrValue}
            onChange={(e) => setNewAttrValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddAttribute()}
            className="h-8 text-sm flex-1"
            placeholder="值"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleAddAttribute}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
          保存
        </Button>
      </div>
    </div>
  );
}
