"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/stores/ai-store";
import { Button } from "@/components/ui/button";
import {
  Bug,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  X,
} from "lucide-react";

/**
 * AI Debug 面板
 * 仅在开发环境或 debugMode 开启时显示
 */
export function AIDebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const { debugMode, toggleDebugMode, lastRequestDebug } = useAIStore();

  // 非 debug 模式不渲染
  if (!debugMode) return null;

  const handleCopy = async () => {
    if (!lastRequestDebug) return;

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(lastRequestDebug, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="border-t border-border/50 bg-amber-500/5">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-amber-500/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Bug className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-amber-600">Debug Mode</span>
          {lastRequestDebug && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(lastRequestDebug.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              toggleDebugMode(false);
            }}
            title="关闭 Debug 模式"
          >
            <X className="h-3 w-3" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {!lastRequestDebug ? (
            <p className="text-xs text-muted-foreground py-2">
              发送消息后将显示请求详情
            </p>
          ) : (
            <>
              {/* 基本信息 */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Function:</span>
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                  {lastRequestDebug.function}
                </span>
                <span className="text-muted-foreground">Provider:</span>
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                  {lastRequestDebug.provider}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                  {lastRequestDebug.model}
                </span>
              </div>

              {/* Messages */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Messages ({lastRequestDebug.messages.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        复制 JSON
                      </>
                    )}
                  </Button>
                </div>

                <div className="max-h-[200px] overflow-auto rounded border border-border bg-muted/50">
                  {lastRequestDebug.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "px-2 py-1.5 text-xs border-b border-border/50 last:border-b-0",
                        msg.role === "system" && "bg-blue-500/5",
                        msg.role === "user" && "bg-green-500/5",
                        msg.role === "assistant" && "bg-purple-500/5"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "font-medium text-[10px] uppercase px-1 py-0.5 rounded",
                            msg.role === "system" &&
                              "bg-blue-500/20 text-blue-600",
                            msg.role === "user" &&
                              "bg-green-500/20 text-green-600",
                            msg.role === "assistant" &&
                              "bg-purple-500/20 text-purple-600"
                          )}
                        >
                          {msg.role}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {msg.content.length} chars
                        </span>
                      </div>
                      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/80 max-h-[100px] overflow-auto">
                        {msg.content}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* Context */}
              {lastRequestDebug.context && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Context</span>
                  <pre className="text-[10px] font-mono bg-muted/50 p-2 rounded border border-border overflow-auto max-h-[100px]">
                    {JSON.stringify(lastRequestDebug.context, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Debug 模式开关按钮（用于在非 debug 模式时开启）
 * 可以放在设置或其他地方
 */
export function AIDebugToggle() {
  const { debugMode, toggleDebugMode } = useAIStore();

  // 生产环境不显示
  if (process.env.NODE_ENV === "production") return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-6 px-2 text-xs gap-1",
        debugMode && "text-amber-500"
      )}
      onClick={() => toggleDebugMode()}
      title={debugMode ? "关闭 Debug 模式" : "开启 Debug 模式"}
    >
      <Bug className="h-3 w-3" />
      <span className="hidden sm:inline">Debug</span>
    </Button>
  );
}
