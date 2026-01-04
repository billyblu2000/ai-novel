"use client";

import { useUIStore } from "@/lib/stores";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect } from "react";
import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { MainContent } from "./main-content";

interface AppShellProps {
  children: ReactNode;
  leftSidebarContent?: ReactNode;
  rightSidebarContent?: ReactNode;
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
}

export function AppShell({
  children,
  leftSidebarContent,
  rightSidebarContent,
  showLeftSidebar = true,
  showRightSidebar = true,
}: AppShellProps) {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    leftSidebarCollapsed,
    rightSidebarCollapsed,
    setLeftSidebarOpen,
    setRightSidebarOpen,
  } = useUIStore();

  // 响应式处理：小屏幕自动关闭侧边栏
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        // 移动端：隐藏双侧边栏
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      } else if (width < 1024) {
        // 平板：左侧常驻，右侧关闭
        setLeftSidebarOpen(true);
        setRightSidebarOpen(false);
      } else {
        // 桌面：双侧边栏展开
        setLeftSidebarOpen(true);
        setRightSidebarOpen(true);
      }
    };

    // 初始化
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setLeftSidebarOpen, setRightSidebarOpen]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* 左侧边栏 */}
      {showLeftSidebar && (
        <LeftSidebar
          isOpen={leftSidebarOpen}
          isCollapsed={leftSidebarCollapsed}
        >
          {leftSidebarContent}
        </LeftSidebar>
      )}

      {/* 主内容区 */}
      <MainContent>{children}</MainContent>

      {/* 右侧边栏 */}
      {showRightSidebar && (
        <RightSidebar
          isOpen={rightSidebarOpen}
          isCollapsed={rightSidebarCollapsed}
        >
          {rightSidebarContent}
        </RightSidebar>
      )}
    </div>
  );
}
