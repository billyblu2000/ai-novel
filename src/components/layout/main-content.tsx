"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MainContentProps {
  children: ReactNode;
  className?: string;
}

export function MainContent({ children, className }: MainContentProps) {
  return (
    <main
      className={cn(
        "flex-1 overflow-auto bg-background transition-all duration-250 ease-in-out",
        className
      )}
    >
      <div className="h-full w-full">
        {children}
      </div>
    </main>
  );
}
