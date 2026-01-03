"use client";

import { useUIStore } from "@/lib/stores";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, PanelRightClose, PanelRight } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface RightSidebarProps {
  children?: ReactNode;
  isOpen: boolean;
  isCollapsed: boolean;
}

export function RightSidebar({ children, isOpen, isCollapsed }: RightSidebarProps) {
  const { setRightSidebarCollapsed, setRightSidebarOpen } = useUIStore();

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-l border-border bg-sidebar transition-all duration-250 ease-in-out",
        isCollapsed ? "w-12" : "w-[300px]"
      )}
    >
      {/* 折叠切换按钮 */}
      <div className="absolute -left-3 top-4 z-10">
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6 rounded-full border bg-background shadow-sm hover:bg-accent"
          onClick={() => setRightSidebarCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronLeft className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
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
            onClick={() => setRightSidebarCollapsed(false)}
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 移动端关闭按钮 */}
      <div className="md:hidden absolute top-4 left-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setRightSidebarOpen(false)}
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
