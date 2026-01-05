/**
 * 聊天功能处理器
 */

import type { FunctionHandler, FunctionHandlerContext, FunctionHandlerResult } from "./base";
import { registerHandler } from "./base";
import { buildChatSystemPrompt, formatUserContexts, injectContextToUserMessage } from "@/lib/ai/prompts";

/**
 * 聊天功能处理器
 */
export const chatHandler: FunctionHandler = {
  functionId: "chat",

  buildMessages(context: FunctionHandlerContext): FunctionHandlerResult {
    const { project, userContexts, userInput } = context;

    // 构建 System Prompt
    const systemPrompt = buildChatSystemPrompt(project);

    // 格式化用户上下文
    const contextInfo = userContexts.length
      ? formatUserContexts(userContexts)
      : undefined;

    // 构建用户消息
    let userMessage = userInput || "";
    if (contextInfo) {
      userMessage = injectContextToUserMessage(userMessage, contextInfo);
    }

    return {
      systemPrompt,
      userMessage,
    };
  },
};

// 注册处理器
registerHandler(chatHandler);
