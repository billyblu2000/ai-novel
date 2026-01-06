/**
 * AI Store - Zustand 状态管理
 * 统一消息流架构：所有交互都是消息
 */

import { create } from "zustand";
import type {
  AISettings,
  FunctionModelConfig,
  ProjectInfo,
  ChatMessage,
  TextMessage,
  SpecialRequestMessage,
  SpecialResultMessage,
  SpecialFunctionType,
  SpecialResultMap,
  SpecialPayloadMap,
  UserContextItem,
  AIFunction,
} from "@/lib/ai/types";
import {
  DEFAULT_AI_SETTINGS,
  createTextMessage,
  createSpecialRequestMessage,
  createSpecialResultMessage,
  isSpecialResultMessage,
} from "@/lib/ai/types";
import {
  loadAISettings,
  updateProviderSettings as updateProviderSettingsStorage,
  updateFunctionModel as updateFunctionModelStorage,
  toggleJailbreak as toggleJailbreakStorage,
} from "@/lib/ai/settings";

// 重新导出类型供外部使用
export type {
  ChatMessage,
  TextMessage,
  SpecialRequestMessage,
  SpecialResultMessage,
  SpecialFunctionType,
  SpecialPayloadMap,
  ModifyResult,
  PlanResult,
  ContinueResult,
  SummarizeResult,
} from "@/lib/ai/types";

/**
 * 待发送的特殊功能信息
 * 用于在输入框中显示 tag
 */
export interface PendingSpecialFunction<T extends SpecialFunctionType = SpecialFunctionType> {
  /** 功能类型 */
  functionType: T;
  /** 功能所需的 Payload */
  payload: SpecialPayloadMap[T];
  /** 用户添加的上下文（可选） */
  userContexts?: UserContextItem[];
  /** 显示文本（用于 tag 显示） */
  displayText: string;
}

/**
 * AI Store 状态接口
 */
interface AIState {
  // ========== 设置相关 ==========
  /** AI 设置 */
  settings: AISettings;
  /** 设置是否已加载 */
  settingsLoaded: boolean;

  // ========== 项目信息 ==========
  /** 当前项目信息 */
  currentProject: ProjectInfo | null;

  // ========== 统一消息流 ==========
  /** 聊天消息历史 */
  chatHistory: ChatMessage[];

  // ========== 临时上下文（用于下次发送） ==========
  /** 用户添加的临时上下文 */
  pendingContexts: UserContextItem[];

  // ========== 待发送的特殊功能 ==========
  /** 待发送的特殊功能（显示为输入框中的 tag） */
  pendingSpecialFunction: PendingSpecialFunction | null;

  // ========== 请求状态 ==========
  /** 是否正在加载（等待首个 token） */
  isLoading: boolean;
  /** 是否正在流式输出 */
  isStreaming: boolean;
  /** 当前流式输出的消息 ID（特殊功能用） */
  streamingMessageId: string | null;
  /** 普通聊天的流式内容 */
  streamingChatContent: string;
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
    function: AIFunction;
    messages: Array<{ role: string; content: string }>;
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
    func: AIFunction,
    config: FunctionModelConfig | "auto"
  ) => void;
  toggleJailbreak: (enabled: boolean) => void;

  // 项目相关
  setCurrentProject: (project: ProjectInfo | null) => void;

  // 临时上下文相关
  addPendingContext: (context: UserContextItem) => void;
  removePendingContext: (index: number) => void;
  clearPendingContexts: () => void;
  consumePendingContexts: () => UserContextItem[];

  // 待发送的特殊功能
  setPendingSpecialFunction: (pending: PendingSpecialFunction | null) => void;
  clearPendingSpecialFunction: () => void;

  // 消息相关
  addTextMessage: (role: "user" | "assistant", content: string, userContexts?: UserContextItem[]) => TextMessage;
  addSpecialRequest: <T extends SpecialFunctionType>(
    functionType: T,
    payload: import("@/lib/ai/types").SpecialPayloadMap[T],
    userInstruction?: string,
    userContexts?: UserContextItem[]
  ) => SpecialRequestMessage<T>;
  addSpecialResult: <T extends SpecialFunctionType>(
    functionType: T,
    requestMessageId: string
  ) => SpecialResultMessage<T>;
  updateSpecialResult: <T extends SpecialFunctionType>(
    messageId: string,
    updates: Partial<{
      result: Partial<SpecialResultMap[T]>;
      isStreaming: boolean;
      streamingContent: string;
      applied: boolean;
    }>
  ) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  clearChatHistory: () => void;

  // 请求状态
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean, messageId?: string | null) => void;
  setStreamingChatContent: (content: string) => void;
  appendStreamingChatContent: (chunk: string) => void;
  setError: (error: string | null) => void;

  // 浮窗状态
  toggleChatWindow: (open?: boolean) => void;
  setHasUnreadMessage: (hasUnread: boolean) => void;

  // Debug 状态
  toggleDebugMode: (enabled?: boolean) => void;
  setLastRequestDebug: (debug: AIState["lastRequestDebug"]) => void;
}

/**
 * AI Store
 */
export const useAIStore = create<AIState>((set, get) => ({
  // ========== 初始状态 ==========
  settings: DEFAULT_AI_SETTINGS,
  settingsLoaded: false,

  currentProject: null,
  chatHistory: [],
  pendingContexts: [],
  pendingSpecialFunction: null,

  isLoading: false,
  isStreaming: false,
  streamingMessageId: null,
  streamingChatContent: "",
  error: null,

  isChatWindowOpen: false,
  hasUnreadMessage: false,

  debugMode: process.env.NODE_ENV === "development",
  lastRequestDebug: null,

  // ========== Actions ==========

  // 加载设置
  loadSettings: () => {
    const settings = loadAISettings();
    set({ settings, settingsLoaded: true });
  },

  // 更新 Provider 设置
  updateProviderSettings: (providerId, apiKey, enabled, baseUrl) => {
    const newSettings = updateProviderSettingsStorage(
      providerId,
      apiKey,
      enabled,
      baseUrl
    );
    set({ settings: newSettings });
  },

  // 更新功能模型配置
  updateFunctionModel: (func, config) => {
    const newSettings = updateFunctionModelStorage(func, config);
    set({ settings: newSettings });
  },

  // 切换破限模式
  toggleJailbreak: (enabled) => {
    const newSettings = toggleJailbreakStorage(enabled);
    set({ settings: newSettings });
  },

  // 设置当前项目
  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  // 添加临时上下文
  addPendingContext: (context) => {
    set((state) => ({
      pendingContexts: [...state.pendingContexts, context],
    }));
  },

  // 移除临时上下文
  removePendingContext: (index) => {
    set((state) => ({
      pendingContexts: state.pendingContexts.filter((_, i) => i !== index),
    }));
  },

  // 清空临时上下文
  clearPendingContexts: () => {
    set({ pendingContexts: [] });
  },

  // 消费临时上下文（获取并清空）
  consumePendingContexts: () => {
    const contexts = get().pendingContexts;
    set({ pendingContexts: [] });
    return contexts;
  },

  // 设置待发送的特殊功能
  setPendingSpecialFunction: (pending) => {
    set({ pendingSpecialFunction: pending });
  },

  // 清空待发送的特殊功能
  clearPendingSpecialFunction: () => {
    set({ pendingSpecialFunction: null });
  },

  // 添加文本消息
  addTextMessage: (role, content, userContexts) => {
    const message = createTextMessage(role, content, userContexts);
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
    }));
    return message;
  },

  // 添加特殊请求消息
  addSpecialRequest: (functionType, payload, userInstruction, userContexts) => {
    const message = createSpecialRequestMessage(
      functionType,
      payload,
      userInstruction,
      userContexts
    );
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
    }));
    return message;
  },

  // 添加特殊结果消息（初始状态，用于流式输出）
  addSpecialResult: (functionType, requestMessageId) => {
    const message = createSpecialResultMessage(functionType, requestMessageId);
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
      streamingMessageId: message.id,
    }));
    return message;
  },

  // 更新特殊结果消息
  updateSpecialResult: (messageId, updates) => {
    set((state) => ({
      chatHistory: state.chatHistory.map((msg) => {
        if (msg.id !== messageId || !isSpecialResultMessage(msg)) {
          return msg;
        }
        const resultMsg = msg as SpecialResultMessage;
        return {
          ...resultMsg,
          ...updates,
          result: updates.result
            ? { ...resultMsg.result, ...updates.result }
            : resultMsg.result,
        } as SpecialResultMessage;
      }),
    }));
  },

  // 更新消息（通用）
  updateMessage: (messageId, updates) => {
    set((state) => ({
      chatHistory: state.chatHistory.map((msg) =>
        msg.id === messageId ? ({ ...msg, ...updates } as ChatMessage) : msg
      ),
    }));
  },

  // 清空聊天历史
  clearChatHistory: () => {
    set({
      chatHistory: [],
      streamingMessageId: null,
      error: null,
    });
  },

  // 设置加载状态
  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  // 设置流式状态
  setStreaming: (streaming, messageId = null) => {
    set({
      isStreaming: streaming,
      streamingMessageId: streaming ? messageId : null,
      // 流式结束时清空聊天流式内容
      streamingChatContent: streaming ? get().streamingChatContent : "",
    });

    // 流式结束时，更新未读消息状态
    if (!streaming) {
      const { isChatWindowOpen } = get();
      if (!isChatWindowOpen) {
        set({ hasUnreadMessage: true });
      }
    }
  },

  // 设置普通聊天的流式内容
  setStreamingChatContent: (content) => {
    set({ streamingChatContent: content });
  },

  // 追加普通聊天的流式内容
  appendStreamingChatContent: (chunk) => {
    set((state) => ({
      streamingChatContent: state.streamingChatContent + chunk,
    }));
  },

  // 设置错误
  setError: (error) => {
    set({ error, isLoading: false, isStreaming: false });
  },

  // 切换聊天窗口
  toggleChatWindow: (open) => {
    set((state) => {
      const newOpen = open !== undefined ? open : !state.isChatWindowOpen;
      return {
        isChatWindowOpen: newOpen,
        hasUnreadMessage: newOpen ? false : state.hasUnreadMessage,
      };
    });
  },

  // 设置未读消息状态
  setHasUnreadMessage: (hasUnread) => {
    set({ hasUnreadMessage: hasUnread });
  },

  // 切换 Debug 模式
  toggleDebugMode: (enabled) => {
    set((state) => ({
      debugMode: enabled !== undefined ? enabled : !state.debugMode,
    }));
  },

  // 设置最近一次请求的 Debug 信息
  setLastRequestDebug: (debug) => {
    set({ lastRequestDebug: debug });
  },
}));

/**
 * 初始化 AI Store（在客户端组件中调用）
 */
export function initializeAIStore() {
  const { settingsLoaded, loadSettings } = useAIStore.getState();
  if (!settingsLoaded) {
    loadSettings();
  }
}
