"use client";

import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Lock, Unlock } from "lucide-react";
import type { AIFunction } from "@/lib/ai/types";

// AI 功能定义
const AI_FUNCTIONS: {
  id: AIFunction;
  name: string;
  group: "chat" | "generate" | "modify";
  description: string;
  requiresSelection?: boolean;
}[] = [
  {
    id: "chat",
    name: "普通对话",
    group: "chat",
    description: "自由对话",
  },
  {
    id: "continue",
    name: "续写",
    group: "generate",
    description: "接续当前内容",
  },
  {
    id: "plan",
    name: "规划",
    group: "generate",
    description: "生成场景摘要",
  },
  {
    id: "summarize",
    name: "总结",
    group: "generate",
    description: "根据内容生成摘要",
  },
  {
    id: "polish",
    name: "润色",
    group: "modify",
    description: "提升文学性",
    requiresSelection: true,
  },
  {
    id: "expand",
    name: "扩写",
    group: "modify",
    description: "丰富细节",
    requiresSelection: true,
  },
  {
    id: "compress",
    name: "缩写",
    group: "modify",
    description: "精简内容",
    requiresSelection: true,
  },
];

/**
 * AI 功能选择器组件
 */
export function AIFunctionSelect() {
  const {
    currentFunction,
    setCurrentFunction,
    selectedText,
    settings,
    toggleJailbreak,
  } = useAIStore();

  // 按分组组织功能
  const chatFunctions = AI_FUNCTIONS.filter((f) => f.group === "chat");
  const generateFunctions = AI_FUNCTIONS.filter((f) => f.group === "generate");
  const modifyFunctions = AI_FUNCTIONS.filter((f) => f.group === "modify");

  // 获取当前功能信息
  const currentFunctionInfo = AI_FUNCTIONS.find((f) => f.id === currentFunction);

  // 检查修改功能是否可用
  const isModifyEnabled = !!selectedText;

  return (
    <div className="flex items-center gap-2">
      {/* 功能选择器 */}
      <Select
        value={currentFunction}
        onValueChange={(value) => setCurrentFunction(value as AIFunction)}
      >
        <SelectTrigger className="flex-1 h-8 text-sm">
          <SelectValue placeholder="选择功能">
            {currentFunctionInfo?.name || "普通对话"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* 聊天 */}
          <SelectGroup>
            {chatFunctions.map((func) => (
              <SelectItem key={func.id} value={func.id}>
                <div className="flex items-center gap-2">
                  <span>{func.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {func.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>

          {/* 生成 */}
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground">
              生成
            </SelectLabel>
            {generateFunctions.map((func) => (
              <SelectItem key={func.id} value={func.id}>
                <div className="flex items-center gap-2">
                  <span>{func.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {func.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>

          {/* 修改 */}
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground">
              修改 {!isModifyEnabled && "(需选中文字)"}
            </SelectLabel>
            {modifyFunctions.map((func) => (
              <SelectItem
                key={func.id}
                value={func.id}
                disabled={!isModifyEnabled}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(!isModifyEnabled && "text-muted-foreground")}>
                    {func.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {func.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* 破限模式开关 */}
      <Button
        variant={settings.jailbreakEnabled ? "destructive" : "outline"}
        size="sm"
        className={cn(
          "h-8 px-2 gap-1",
          settings.jailbreakEnabled && "bg-gradient-to-r from-purple-500 to-pink-500 border-0"
        )}
        onClick={() => toggleJailbreak(!settings.jailbreakEnabled)}
        title={settings.jailbreakEnabled ? "关闭破限模式" : "开启破限模式"}
      >
        {settings.jailbreakEnabled ? (
          <>
            <Unlock className="h-3.5 w-3.5" />
            <span className="text-xs">破限</span>
          </>
        ) : (
          <>
            <Lock className="h-3.5 w-3.5" />
            <span className="text-xs">破限</span>
          </>
        )}
      </Button>
    </div>
  );
}
