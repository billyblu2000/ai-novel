"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PanelLeft, PanelRight } from "lucide-react";
import { ReactNode, useState, cloneElement, isValidElement, ReactElement } from "react";

interface MobileNavProps {
  leftSidebarContent?: ReactNode;
  rightSidebarContent?: ReactNode;
}

export function MobileNav({ leftSidebarContent, rightSidebarContent }: MobileNavProps) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  // Wrap content to close sheet on node selection
  const wrapWithCloseHandler = (content: ReactNode, closeSheet: () => void): ReactNode => {
    if (!isValidElement(content)) return content;
    
    const element = content as ReactElement<{ onNodeSelect?: (node: unknown) => void }>;
    const originalOnNodeSelect = element.props.onNodeSelect;
    
    if (originalOnNodeSelect) {
      return cloneElement(element, {
        onNodeSelect: (node: unknown) => {
          originalOnNodeSelect(node);
          closeSheet();
        },
      });
    }
    
    return content;
  };

  return (
    <div className="flex md:hidden items-center gap-2">
      {/* 左侧边栏 Sheet */}
      {leftSidebarContent && (
        <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">打开导航</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            {wrapWithCloseHandler(leftSidebarContent, () => setLeftOpen(false))}
          </SheetContent>
        </Sheet>
      )}

      {/* 右侧边栏 Sheet */}
      {rightSidebarContent && (
        <Sheet open={rightOpen} onOpenChange={setRightOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <PanelRight className="h-5 w-5" />
              <span className="sr-only">打开面板</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] p-0">
            {rightSidebarContent}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
