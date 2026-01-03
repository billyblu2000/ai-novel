"use client";

import { Save, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/date";

interface EditorToolbarProps {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  onSave?: () => void;
  className?: string;
}

export function EditorToolbar({
  isDirty,
  isSaving,
  lastSavedAt,
  onSave,
  className,
}: EditorToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>保存中...</span>
          </>
        ) : isDirty ? (
          <>
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span>未保存</span>
          </>
        ) : (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span>
              {lastSavedAt ? `已保存 ${formatRelativeTime(lastSavedAt)}` : "已保存"}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="h-8"
        >
          <Save className="h-4 w-4 mr-1" />
          保存
        </Button>
      </div>
    </div>
  );
}
