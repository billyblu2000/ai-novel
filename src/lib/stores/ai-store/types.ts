/**
 * AI Store 类型定义
 * 统一管理所有 AI 相关的类型
 */

import type {
  AISettings,
  ChatMessage,
  UserContextItem,
  FunctionModelConfig,
  ProjectInfo,
  ModifyEnhancedContext,
} from "@/lib/ai/types";
import type { PlanContext, PlannedChild } from "@/lib/ai/prompts/plan";

// 重新导出供外部使用
export type { ModifyEnhancedContext } from "@/lib/ai/types";
export type { PlanContext, PlannedChild } from "@/lib/ai/prompts/plan";

/**
 * 修改任务类型
 */
export type ModifyTaskType = "polish" | "expand" | "compress";

/**
 * 任务状态
 */
export type TaskStatus = "pending" | "processing" | "completed" | "applied" | "cancelled";

/**
 * 修改任务
 */
export interface ModifyTask {
  type: "modify";
  /** 修改类型 */
  modifyType: ModifyTaskType;
  /** 选中的文本 */
  selectedText: string;
  /** 增强上下文 */
  enhancedContext?: ModifyEnhancedContext;
  /** 用户额外输入 */
  userInput?: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 结果 - 修改后的文本 */
  resultText?: string;
  /** 结果 - 说明 */
  resultExplanation?: string;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 规划任务
 */
export interface PlanTask {
  type: "plan";
  /** 规划上下文 */
  context: PlanContext;
  /** 目标节点 ID */
  targetNodeId: string;
  /** 目标节点标题（用于显示） */
  targetNodeTitle: string;
  /** 用户额外输入 */
  userInput?: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 结果 - 规划的子节点 */
  resultChildren?: PlannedChild[];
  /** 结果 - 说明 */
  resultExplanation?: string;
  /** 创建时间 */
  createdAt: number;
}

/**
 * AI 任务联合类型
 */
export type AITask = ModifyTask | PlanTask;

/**
 * 任务消息 - 嵌入到聊天历史中的任务卡片
 */
export interface TaskMessage {
  role: "task";
  task: AITask;
}

/**
 * 扩展的聊天消息类型
 */
export type ExtendedChatMessage = ChatMessage | TaskMessage;

/**
 * AI Store 状态接口
 */
export interface AIState {
  // ========== 设置相关 ==========
  /** AI 设置 */
  settings: AISettings;
  /** 设置是否已加载 */
  settingsLoaded: boolean;

  // ========== 聊天状态 ==========
  /** 当前项目信息 */
  currentProject: ProjectInfo | null;
  /** 聊天历史（包含普通消息和任务卡片） */
  chatHistory: ExtendedChatMessage[];
  /** 用户添加的上下文 */
  userContexts: UserContextItem[];

  // ========== 任务状态 ==========
  /** 当前活跃的任务（可为空） */
  activeTask: AITask | null;
  /** 上下文增强是否启用 */
  contextEnhancementEnabled: boolean;

  // ========== 请求状态 ==========
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在流式输出 */
  isStreaming: boolean;
  /** 当前流式输出的内容 */
  streamingContent: string;
  /** 错误信息 */
  error: string | null;

  // ========== 浮窗状态 ==========
  /** 聊天浮窗是否展开 */
  isChatWindowOpen: boolean;
  /** 是否有未读消息 */
  hasUnreadMessage: boolean;

  // ========== Debug 状态 ==========
  /** Debug 模式是否开启 */
  debugMode: boolean;
  /** 最近一次请求的 Debug 信息 */
  lastRequestDebug: {
    timestamp: number;
    function: string;
    messages: ChatMessage[];
    context?: unknown;
    provider: string;
    model: string;
  } | null;

  // ========== Actions ==========
  // 设置相关
  loadSettings: () => void;
  updateProviderSettings: (
    providerId: string,
    apiKey: string,
    enabled: boolean,
    baseUrl?: string
  ) => void;
  updateFunctionModel: (
    func: string,
    config: FunctionModelConfig | "auto"
  ) => void;
  toggleJailbreak: (enabled: boolean) => void;

  // 聊天相关
  setCurrentProject: (project: ProjectInfo | null) => void;
  addUserContext: (context: UserContextItem) => void;
  removeUserContext: (index: number) => void;
  clearUserContexts: () => void;
  addMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;

  // 任务相关
  createModifyTask: (params: {
    modifyType: ModifyTaskType;
    selectedText: string;
    enhancedContext?: ModifyEnhancedContext;
  }) => void;
  createPlanTask: (params: {
    context: PlanContext;
    targetNodeId: string;
    targetNodeTitle: string;
  }) => void;
  updateTaskUserInput: (userInput: string) => void;
  startTask: () => void;
  updateTaskResult: (result: {
    text?: string;
    children?: PlannedChild[];
    explanation?: string;
  }) => void;
  completeTask: () => void;
  applyTask: () => void;
  cancelTask: () => void;
  toggleContextEnhancement: (enabled?: boolean) => void;

  // 请求状态
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setError: (error: string | null) => void;

  // 浮窗状态
  toggleChatWindow: (open?: boolean) => void;
  setHasUnreadMessage: (hasUnread: boolean) => void;

  // Debug 状态
  toggleDebugMode: (enabled?: boolean) => void;
  setLastRequestDebug: (debug: AIState["lastRequestDebug"]) => void;
}

/**
 * 类型守卫：判断是否为修改任务
 */
export function isModifyTask(task: AITask | null): task is ModifyTask {
  return task?.type === "modify";
}

/**
 * 类型守卫：判断是否为规划任务
 */
export function isPlanTask(task: AITask | null): task is PlanTask {
  return task?.type === "plan";
}

/**
 * 类型守卫：判断消息是否为任务消息
 */
export function isTaskMessage(message: ExtendedChatMessage): message is TaskMessage {
  return message.role === "task";
}

/**
 * 获取修改类型的显示名称
 */
export function getModifyTypeName(type: ModifyTaskType): string {
  const names: Record<ModifyTaskType, string> = {
    polish: "润色",
    expand: "扩写",
    compress: "缩写",
  };
  return names[type];
}
