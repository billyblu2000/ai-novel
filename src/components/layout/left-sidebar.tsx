"use client";

import { useUIStore } from "@/lib/stores";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, PanelLeft, PanelLeftClose } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface LeftSidebarProps {
  children?: ReactNode;
  isOpen: boolean;
  isCollapsed: boolean;
}

export function LeftSidebar({ children, isOpen, isCollapsed }: LeftSidebarProps) {
  const { setLeftSidebarCollapsed, setLeftSidebarOpen } = useUIStore();

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-sidebar transition-all duration-250 ease-in-out",
        isCollapsed ? "w-12" : "w-[250px]"
      )}
    >
      {/* 折叠切换按钮 */}
      <div className="absolute -right-3 top-4 z-10">
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6 rounded-full border bg-background shadow-sm hover:bg-accent"
          onClick={() => setLeftSidebarCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* 侧边栏内容 */}
      <div
        className={cn(
          "flex-1 overflow-hidden",
          isCollapsed ? "opacity-0" : "opacity-100"
        )}
      >
        {!isCollapsed && children}
      </div>

      {/* 折叠状态下的图标模式 */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-2 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLeftSidebarCollapsed(false)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 移动端关闭按钮 */}
      <div className="md:hidden absolute top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setLeftSidebarOpen(false)}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
