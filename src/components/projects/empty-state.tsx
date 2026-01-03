import { Button } from "@/components/ui/button";
import { PenLine, Plus } from "lucide-react";
import { CreateProjectDialog } from "./create-project-dialog";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <PenLine className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">还没有项目</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        创建你的第一个小说项目，开始 AI 辅助创作之旅。支持无限层级目录、智能实体管理和 AI 写作助手。
      </p>
      <CreateProjectDialog
        trigger={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            创建第一个项目
          </Button>
        }
      />
    </div>
  );
}
