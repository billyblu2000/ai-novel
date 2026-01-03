"use client";

import { useUIStore } from "@/lib/stores";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PanelLeft, PanelRight } from "lucide-react";
import { ReactNode } from "react";
import Link from "next/link";
import { MobileNav } from "./mobile-nav";

interface HeaderProps {
  title?: string;
  showLeftToggle?: boolean;
  showRightToggle?: boolean;
  leftSidebarContent?: ReactNode;
  rightSidebarContent?: ReactNode;
  actions?: ReactNode;
}

export function Header({
  title,
  showLeftToggle = true,
  showRightToggle = true,
  leftSidebarContent,
  rightSidebarContent,
  actions,
}: HeaderProps) {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
  } = useUIStore();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* 移动端导航 */}
      <MobileNav
        leftSidebarContent={leftSidebarContent}
        rightSidebarContent={rightSidebarContent}
      />

      {/* 左侧边栏切换按钮 (桌面端) */}
      {showLeftToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex h-9 w-9"
          onClick={toggleLeftSidebar}
        >
          <PanelLeft className={cn("h-5 w-5", !leftSidebarOpen && "text-muted-foreground")} />
          <span className="sr-only">切换左侧边栏</span>
        </Button>
      )}

      {/* Logo / 标题 */}
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">AI Novel Studio</span>
        </Link>
        {title && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{title}</span>
          </>
        )}
      </div>

      {/* 右侧操作区 */}
      <div className="ml-auto flex items-center gap-2">
        {actions}

        {/* 右侧边栏切换按钮 (桌面端) */}
        {showRightToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-9 w-9"
            onClick={toggleRightSidebar}
          >
            <PanelRight className={cn("h-5 w-5", !rightSidebarOpen && "text-muted-foreground")} />
            <span className="sr-only">切换右侧边栏</span>
          </Button>
        )}
      </div>
    </header>
  );
}
