/**
 * AI Store - Zustand 状态管理
 * 管理 AI 功能的全局状态
 */

import { create } from "zustand";
import type {
  AISettings,
  AIFunction,
  ChatMessage,
  UserContextItem,
  FunctionModelConfig,
} from "@/lib/ai/types";
import { DEFAULT_AI_SETTINGS } from "@/lib/ai/types";
import {
  loadAISettings,
  saveAISettings,
  updateProviderSettings as updateProviderSettingsStorage,
  updateFunctionModel as updateFunctionModelStorage,
  updateCustomPrompt as updateCustomPromptStorage,
  toggleJailbreak as toggleJailbreakStorage,
} from "@/lib/ai/settings";

/**
 * AI Store 状态接口
 */
interface AIState {
  // ========== 设置相关 ==========
  /** AI 设置 */
  settings: AISettings;
  /** 设置是否已加载 */
  settingsLoaded: boolean;

  // ========== 聊天状态 ==========
  /** 当前聊天历史 */
  chatHistory: ChatMessage[];
  /** 当前选择的功能 */
  currentFunction: AIFunction;
  /** 用户添加的上下文 */
  userContexts: UserContextItem[];
  /** 选中的文字（用于修改功能） */
  selectedText: string | null;

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
  updateCustomPrompt: (func: AIFunction, prompt: string | null) => void;
  toggleJailbreak: (enabled: boolean) => void;

  // 聊天相关
  setCurrentFunction: (func: AIFunction) => void;
  addUserContext: (context: UserContextItem) => void;
  removeUserContext: (index: number) => void;
  clearUserContexts: () => void;
  setSelectedText: (text: string | null) => void;
  addMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;

  // 请求状态
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setError: (error: string | null) => void;

  // 浮窗状态
  toggleChatWindow: (open?: boolean) => void;
  setHasUnreadMessage: (hasUnread: boolean) => void;
}

/**
 * AI Store
 */
export const useAIStore = create<AIState>((set, get) => ({
  // ========== 初始状态 ==========
  settings: DEFAULT_AI_SETTINGS,
  settingsLoaded: false,

  chatHistory: [],
  currentFunction: "chat",
  userContexts: [],
  selectedText: null,

  isLoading: false,
  isStreaming: false,
  streamingContent: "",
  error: null,

  isChatWindowOpen: false,
  hasUnreadMessage: false,

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

  // 更新自定义 Prompt
  updateCustomPrompt: (func, prompt) => {
    const newSettings = updateCustomPromptStorage(func, prompt);
    set({ settings: newSettings });
  },

  // 切换破限模式
  toggleJailbreak: (enabled) => {
    const newSettings = toggleJailbreakStorage(enabled);
    set({ settings: newSettings });
  },

  // 设置当前功能
  setCurrentFunction: (func) => {
    set({ currentFunction: func });
  },

  // 添加用户上下文
  addUserContext: (context) => {
    set((state) => ({
      userContexts: [...state.userContexts, context],
    }));
  },

  // 移除用户上下文
  removeUserContext: (index) => {
    set((state) => ({
      userContexts: state.userContexts.filter((_, i) => i !== index),
    }));
  },

  // 清空用户上下文
  clearUserContexts: () => {
    set({ userContexts: [] });
  },

  // 设置选中文字
  setSelectedText: (text) => {
    set({ selectedText: text });
  },

  // 添加消息
  addMessage: (message) => {
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
    }));
  },

  // 清空聊天历史
  clearChatHistory: () => {
    set({ chatHistory: [], streamingContent: "" });
  },

  // 设置加载状态
  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  // 设置流式状态
  setStreaming: (streaming) => {
    set({ isStreaming: streaming });
    if (!streaming) {
      // 流式结束时，将内容添加到聊天历史
      const content = get().streamingContent;
      if (content) {
        set((state) => ({
          chatHistory: [
            ...state.chatHistory,
            { role: "assistant", content },
          ],
          streamingContent: "",
          hasUnreadMessage: !state.isChatWindowOpen,
        }));
      }
    }
  },

  // 设置流式内容
  setStreamingContent: (content) => {
    set({ streamingContent: content });
  },

  // 追加流式内容
  appendStreamingContent: (chunk) => {
    set((state) => ({
      streamingContent: state.streamingContent + chunk,
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
