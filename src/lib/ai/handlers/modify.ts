/**
 * 修改功能处理器
 * 包含润色、扩写、缩写三个功能
 */

import type { FunctionHandler, FunctionHandlerContext, FunctionHandlerResult } from "./base";
import { registerHandler } from "./base";
import {
  getModifySystemPrompt,
  buildModifyUserMessage,
  parseModifyResult,
  type ModifyResult,
} from "@/lib/ai/prompts";
import { formatUserContexts } from "@/lib/ai/prompts";

/**
 * 创建修改功能处理器
 */
function createModifyHandler(
  functionId: "polish" | "expand" | "compress"
): FunctionHandler {
  return {
    functionId,

    buildMessages(context: FunctionHandlerContext): FunctionHandlerResult {
      const { project, userContexts, selectedText, userInput } = context;

      if (!selectedText) {
        throw new Error("修改功能需要选中文本");
      }

      // 格式化用户上下文（排除 selection 类型）
      const nonSelectionContexts = userContexts.filter(
        (ctx) => ctx.type !== "selection"
      );
      const contextInfo = nonSelectionContexts.length
        ? formatUserContexts(nonSelectionContexts)
        : undefined;

      // 获取 System Prompt
      const systemPrompt = getModifySystemPrompt(functionId, project);

      // 构建用户消息
      const userMessage = buildModifyUserMessage(
        selectedText,
        contextInfo,
        userInput
      );

      return {
        systemPrompt,
        userMessage,
      };
    },

    parseResponse(content: string): ModifyResult {
      return parseModifyResult(content);
    },
  };
}

// 创建并注册修改功能处理器
export const polishHandler = createModifyHandler("polish");
export const expandHandler = createModifyHandler("expand");
export const compressHandler = createModifyHandler("compress");

// 注册处理器
registerHandler(polishHandler);
registerHandler(expandHandler);
registerHandler(compressHandler);
