/**
 * AI 聊天消息类型定义
 * 统一消息流架构：所有交互都是消息，只是类型不同
 */

import type { AIFunction } from "./function";
import type { ModifyEnhancedContext, UserContextItem } from "./context";

// ============================================================
// 基础消息类型
// ============================================================

/**
 * 消息基础接口
 */
interface BaseMessage {
  /** 唯一标识 */
  id: string;
  /** 创建时间戳 */
  timestamp: number;
}

// ============================================================
// 普通文本消息
// ============================================================

/**
 * 普通文本消息（用户或 AI）
 */
export interface TextMessage extends BaseMessage {
  type: "text";
  role: "user" | "assistant";
  content: string;
  /** 用户消息附带的参考内容（仅用于界面显示，不持久化到对话历史） */
  userContexts?: UserContextItem[];
}

// ============================================================
// 特殊功能类型定义
// ============================================================

/**
 * 特殊功能类型（排除普通聊天）
 */
export type SpecialFunctionType = Exclude<AIFunction, "chat">;

/**
 * 修改功能类型
 */
export type ModifyFunctionType = "polish" | "expand" | "compress";

/**
 * 生成功能类型
 */
export type GenerateFunctionType = "plan" | "continue" | "summarize";

// ============================================================
// 特殊功能 Payload 定义
// ============================================================

/**
 * 修改功能的请求 Payload
 */
export interface ModifyPayload {
  /** 选中的原始文本 */
  selectedText: string;
  /** 增强上下文（可选） */
  enhancedContext?: ModifyEnhancedContext;
}

/**
 * 规划功能的请求 Payload
 */
export interface PlanPayload {
  /** 当前节点 ID */
  nodeId: string;
  /** 当前节点名称 */
  nodeName: string;
  /** 当前节点大纲 */
  nodeOutline: string;
  /** 已有子节点列表 */
  existingChildren: Array<{
    title: string;
    summary: string;
    type: "FOLDER" | "FILE";
  }>;
  /** 父节点信息（上下文增强） */
  parentNode?: {
    name: string;
    outline: string;
  };
  /** 关联实体（上下文增强） */
  relatedEntities?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

/**
 * 续写功能的请求 Payload
 */
export interface ContinuePayload {
  /** 当前节点 ID */
  nodeId: string;
  /** 当前节点名称 */
  nodeName: string;
  /** 当前节点摘要 */
  nodeSummary?: string;
  /** 光标前的内容 */
  contentBefore: string;
  /** 光标后的内容（最多200字） */
  contentAfter?: string;
  /** 父节点链（从根到父，包含名称和摘要） */
  ancestorChain: Array<{
    name: string;
    summary: string;
  }>;
  /** 关联实体（从节点摘要和正文中提取） */
  relatedEntities?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

/**
 * 总结功能的请求 Payload
 */
export interface SummarizePayload {
  /** 当前节点 ID */
  nodeId: string;
  /** 需要总结的内容 */
  content: string;
  /** 节点类型 */
  nodeType: "FOLDER" | "FILE";
}

/**
 * 特殊功能 Payload 映射
 */
export type SpecialPayloadMap = {
  polish: ModifyPayload;
  expand: ModifyPayload;
  compress: ModifyPayload;
  plan: PlanPayload;
  continue: ContinuePayload;
  summarize: SummarizePayload;
};

// ============================================================
// 特殊功能结果定义
// ============================================================

/**
 * 修改功能的结果
 */
export interface ModifyResult {
  /** 修改后的文本 */
  modifiedText: string;
  /** 修改说明 */
  explanation?: string;
}

/**
 * 规划功能的结果
 */
export interface PlanResult {
  /** 规划的子节点列表 */
  children: Array<{
    title: string;
    summary: string;
    type: "FOLDER" | "FILE";
  }>;
  /** 规划说明 */
  explanation?: string;
}

/**
 * 续写功能的结果
 */
export interface ContinueResult {
  /** 续写的内容 */
  content: string;
}

/**
 * 总结功能的结果
 */
export interface SummarizeResult {
  /** 生成的摘要 */
  summary: string;
}

/**
 * 特殊功能结果映射
 */
export type SpecialResultMap = {
  polish: ModifyResult;
  expand: ModifyResult;
  compress: ModifyResult;
  plan: PlanResult;
  continue: ContinueResult;
  summarize: SummarizeResult;
};

// ============================================================
// 特殊功能请求消息
// ============================================================

/**
 * 特殊功能请求消息（用户发出）
 * 当用户触发特殊功能时，系统自动构建此消息
 */
export interface SpecialRequestMessage<T extends SpecialFunctionType = SpecialFunctionType>
  extends BaseMessage {
  type: "special_request";
  role: "user";
  /** 功能类型 */
  functionType: T;
  /** 功能所需的上下文数据 */
  payload: SpecialPayloadMap[T];
  /** 用户额外输入（可选） */
  userInstruction?: string;
  /** 用户添加的上下文（可选） */
  userContexts?: UserContextItem[];
}

// ============================================================
// 特殊功能结果消息
// ============================================================

/**
 * 特殊功能结果消息（AI 返回）
 */
export interface SpecialResultMessage<T extends SpecialFunctionType = SpecialFunctionType>
  extends BaseMessage {
  type: "special_result";
  role: "assistant";
  /** 功能类型 */
  functionType: T;
  /** 结果数据 */
  result: SpecialResultMap[T];
  /** 是否正在流式输出 */
  isStreaming: boolean;
  /** 流式输出中的原始内容（用于显示） */
  streamingContent?: string;
  /** 是否已应用（修改/规划功能） */
  applied?: boolean;
  /** 关联的请求消息 ID */
  requestMessageId: string;
}

// ============================================================
// 统一消息类型
// ============================================================

/**
 * 聊天消息联合类型
 */
export type ChatMessage =
  | TextMessage
  | SpecialRequestMessage
  | SpecialResultMessage;

// ============================================================
// 类型守卫
// ============================================================

/**
 * 判断是否为文本消息
 */
export function isTextMessage(message: ChatMessage): message is TextMessage {
  return message.type === "text";
}

/**
 * 判断是否为特殊请求消息
 */
export function isSpecialRequestMessage(
  message: ChatMessage
): message is SpecialRequestMessage {
  return message.type === "special_request";
}

/**
 * 判断是否为特殊结果消息
 */
export function isSpecialResultMessage(
  message: ChatMessage
): message is SpecialResultMessage {
  return message.type === "special_result";
}

/**
 * 判断是否为修改功能
 */
export function isModifyFunctionType(
  functionType: SpecialFunctionType
): functionType is ModifyFunctionType {
  return ["polish", "expand", "compress"].includes(functionType);
}

/**
 * 判断是否为生成功能
 */
export function isGenerateFunctionType(
  functionType: SpecialFunctionType
): functionType is GenerateFunctionType {
  return ["plan", "continue", "summarize"].includes(functionType);
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 生成消息 ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建文本消息
 */
export function createTextMessage(
  role: "user" | "assistant",
  content: string,
  userContexts?: UserContextItem[]
): TextMessage {
  return {
    id: generateMessageId(),
    timestamp: Date.now(),
    type: "text",
    role,
    content,
    userContexts: role === "user" ? userContexts : undefined,
  };
}

/**
 * 创建特殊请求消息
 */
export function createSpecialRequestMessage<T extends SpecialFunctionType>(
  functionType: T,
  payload: SpecialPayloadMap[T],
  userInstruction?: string,
  userContexts?: UserContextItem[]
): SpecialRequestMessage<T> {
  return {
    id: generateMessageId(),
    timestamp: Date.now(),
    type: "special_request",
    role: "user",
    functionType,
    payload,
    userInstruction,
    userContexts,
  };
}

/**
 * 创建特殊结果消息（初始状态，用于流式输出）
 */
export function createSpecialResultMessage<T extends SpecialFunctionType>(
  functionType: T,
  requestMessageId: string,
  initialResult?: Partial<SpecialResultMap[T]>
): SpecialResultMessage<T> {
  // 根据功能类型创建默认结果
  let defaultResult: SpecialResultMap[T];
  switch (functionType) {
    case "polish":
    case "expand":
    case "compress":
      defaultResult = { modifiedText: "", explanation: undefined } as unknown as SpecialResultMap[T];
      break;
    case "plan":
      defaultResult = { children: [], explanation: undefined } as unknown as SpecialResultMap[T];
      break;
    case "continue":
      defaultResult = { content: "" } as unknown as SpecialResultMap[T];
      break;
    case "summarize":
      defaultResult = { summary: "" } as unknown as SpecialResultMap[T];
      break;
    default:
      defaultResult = {} as SpecialResultMap[T];
  }

  return {
    id: generateMessageId(),
    timestamp: Date.now(),
    type: "special_result",
    role: "assistant",
    functionType,
    result: { ...defaultResult, ...initialResult } as SpecialResultMap[T],
    isStreaming: true,
    requestMessageId,
  };
}

// ============================================================
// 功能显示名称
// ============================================================

/**
 * 特殊功能显示名称
 */
export const SPECIAL_FUNCTION_NAMES: Record<SpecialFunctionType, string> = {
  polish: "润色",
  expand: "扩写",
  compress: "缩写",
  plan: "规划",
  continue: "续写",
  summarize: "总结",
};

/**
 * 获取功能显示名称
 */
export function getSpecialFunctionName(functionType: SpecialFunctionType): string {
  return SPECIAL_FUNCTION_NAMES[functionType];
}
