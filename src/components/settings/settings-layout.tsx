"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bot, User, Palette, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsLayoutProps {
  children: ReactNode;
}

// 设置分类
const SETTINGS_CATEGORIES = [
  {
    id: "profile",
    name: "个人资料",
    icon: User,
    disabled: true,
  },
  {
    id: "ai",
    name: "AI 设置",
    icon: Bot,
    disabled: false,
  },
  {
    id: "appearance",
    name: "外观主题",
    icon: Palette,
    disabled: true,
  },
];

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "ai";

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* 左侧导航 - 桌面端 */}
      <aside className="hidden md:flex w-56 flex-col border-r bg-muted/30">
        <div className="p-4">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Link>
          </Button>
          <h2 className="text-lg font-semibold">设置</h2>
        </div>
        <nav className="flex-1 px-2">
          {SETTINGS_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = currentTab === category.id;

            return (
              <Link
                key={category.id}
                href={
                  category.disabled
                    ? "#"
                    : `${pathname}?tab=${category.id}`
                }
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  category.disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={(e) => category.disabled && e.preventDefault()}
              >
                <Icon className="h-4 w-4" />
                {category.name}
                {category.disabled && (
                  <span className="ml-auto text-xs">(即将推出)</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 移动端顶部 Tab */}
      <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-background border-b">
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          {SETTINGS_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = currentTab === category.id;

            return (
              <Link
                key={category.id}
                href={
                  category.disabled
                    ? "#"
                    : `${pathname}?tab=${category.id}`
                }
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                  category.disabled && "opacity-50"
                )}
                onClick={(e) => category.disabled && e.preventDefault()}
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 右侧内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden h-12" /> {/* 移动端 Tab 占位 */}
        <div className="container max-w-3xl py-6 px-4 md:py-8 md:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
