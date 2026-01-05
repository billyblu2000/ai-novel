/**
 * AI 功能处理器基类
 * 定义功能处理器的通用接口
 */

import type { AIFunction, ChatMessage, ProjectInfo, UserContextItem } from "@/lib/ai/types";

/**
 * 功能处理器上下文
 */
export interface FunctionHandlerContext {
  /** 项目信息 */
  project?: ProjectInfo;
  /** 用户上下文 */
  userContexts: UserContextItem[];
  /** 选中的文本（修改功能） */
  selectedText?: string;
  /** 用户额外输入 */
  userInput?: string;
  /** 是否启用破限模式 */
  jailbreak?: boolean;
}

/**
 * 功能处理器结果
 */
export interface FunctionHandlerResult {
  /** System Prompt */
  systemPrompt: string;
  /** 用户消息 */
  userMessage: string;
  /** 完整消息列表（用于聊天功能） */
  messages?: ChatMessage[];
}

/**
 * 功能处理器接口
 */
export interface FunctionHandler {
  /** 功能 ID */
  functionId: AIFunction;
  
  /**
   * 构建请求消息
   * @param context 处理器上下文
   * @returns 处理结果
   */
  buildMessages(context: FunctionHandlerContext): FunctionHandlerResult;
  
  /**
   * 解析响应（可选，用于结构化输出）
   * @param content AI 返回的内容
   * @returns 解析后的结果
   */
  parseResponse?(content: string): unknown;
}

/**
 * 功能处理器注册表
 */
const handlers = new Map<AIFunction, FunctionHandler>();

/**
 * 注册功能处理器
 */
export function registerHandler(handler: FunctionHandler): void {
  handlers.set(handler.functionId, handler);
}

/**
 * 获取功能处理器
 */
export function getHandler(functionId: AIFunction): FunctionHandler | undefined {
  return handlers.get(functionId);
}

/**
 * 获取所有已注册的处理器
 */
export function getAllHandlers(): FunctionHandler[] {
  return Array.from(handlers.values());
}
