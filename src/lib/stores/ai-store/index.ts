/**
 * AI Store - Zustand 状态管理
 * 重构版：统一任务模式，简化状态结构
 */

import { create } from "zustand";
import type { AIFunction, ChatMessage, FunctionModelConfig } from "@/lib/ai/types";
import { DEFAULT_AI_SETTINGS } from "@/lib/ai/types";
import {
  loadAISettings,
  updateProviderSettings as updateProviderSettingsStorage,
  updateFunctionModel as updateFunctionModelStorage,
  toggleJailbreak as toggleJailbreakStorage,
} from "@/lib/ai/settings";
import type {
  AIState,
  AITask,
  ModifyTask,
  PlanTask,
  ModifyTaskType,
  PlannedChild,
} from "./types";

// 重新导出类型
export * from "./types";

/**
 * AI Store
 */
export const useAIStore = create<AIState>((set, get) => ({
  // ========== 初始状态 ==========
  settings: DEFAULT_AI_SETTINGS,
  settingsLoaded: false,

  chatHistory: [],
  currentProject: null,
  userContexts: [],

  activeTask: null,
  contextEnhancementEnabled: false,

  isLoading: false,
  isStreaming: false,
  streamingContent: "",
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
    const newSettings = updateFunctionModelStorage(func as AIFunction, config);
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

  // 添加消息
  addMessage: (message) => {
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
    }));
  },

  // 清空聊天历史
  clearChatHistory: () => {
    set({
      chatHistory: [],
      streamingContent: "",
      activeTask: null,
    });
  },

  // 创建修改任务
  createModifyTask: ({ modifyType, selectedText, enhancedContext }) => {
    const task: ModifyTask = {
      type: "modify",
      modifyType,
      selectedText,
      enhancedContext,
      status: "pending",
      createdAt: Date.now(),
    };
    set((state) => ({
      activeTask: task,
      // 将任务添加到聊天历史
      chatHistory: [...state.chatHistory, { role: "task" as const, task }],
    }));
  },

  // 创建规划任务
  createPlanTask: ({ context, targetNodeId, targetNodeTitle }) => {
    const task: PlanTask = {
      type: "plan",
      context,
      targetNodeId,
      targetNodeTitle,
      status: "pending",
      createdAt: Date.now(),
    };
    set((state) => ({
      activeTask: task,
      // 将任务添加到聊天历史
      chatHistory: [...state.chatHistory, { role: "task" as const, task }],
    }));
  },

  // 更新任务的用户输入
  updateTaskUserInput: (userInput) => {
    set((state) => {
      if (!state.activeTask) return state;
      const updatedTask = { ...state.activeTask, userInput };
      return {
        activeTask: updatedTask,
        // 同时更新聊天历史中的任务
        chatHistory: state.chatHistory.map((msg) =>
          msg.role === "task" && msg.task.createdAt === state.activeTask?.createdAt
            ? { ...msg, task: updatedTask }
            : msg
        ),
      };
    });
  },

  // 开始执行任务
  startTask: () => {
    set((state) => {
      if (!state.activeTask) return state;
      const updatedTask = { ...state.activeTask, status: "processing" as const };
      return {
        activeTask: updatedTask,
        chatHistory: state.chatHistory.map((msg) =>
          msg.role === "task" && msg.task.createdAt === state.activeTask?.createdAt
            ? { ...msg, task: updatedTask }
            : msg
        ),
      };
    });
  },

  // 更新任务结果（用于流式输出）
  updateTaskResult: ({ text, children, explanation }) => {
    set((state) => {
      if (!state.activeTask) return state;

      let updatedTask: AITask;
      if (state.activeTask.type === "modify") {
        updatedTask = {
          ...state.activeTask,
          resultText: text ?? state.activeTask.resultText,
          resultExplanation: explanation ?? state.activeTask.resultExplanation,
        };
      } else {
        updatedTask = {
          ...state.activeTask,
          resultChildren: children ?? state.activeTask.resultChildren,
          resultExplanation: explanation ?? state.activeTask.resultExplanation,
        };
      }

      return {
        activeTask: updatedTask,
        chatHistory: state.chatHistory.map((msg) =>
          msg.role === "task" && msg.task.createdAt === state.activeTask?.createdAt
            ? { ...msg, task: updatedTask }
            : msg
        ),
      };
    });
  },

  // 完成任务
  completeTask: () => {
    set((state) => {
      if (!state.activeTask) return state;
      const updatedTask = { ...state.activeTask, status: "completed" as const };
      return {
        activeTask: updatedTask,
        chatHistory: state.chatHistory.map((msg) =>
          msg.role === "task" && msg.task.createdAt === state.activeTask?.createdAt
            ? { ...msg, task: updatedTask }
            : msg
        ),
      };
    });
  },

  // 应用任务（标记为已应用）
  applyTask: () => {
    set((state) => {
      if (!state.activeTask) return state;
      const updatedTask = { ...state.activeTask, status: "applied" as const };
      return {
        // 应用后清空 activeTask，允许创建新任务
        activeTask: null,
        chatHistory: state.chatHistory.map((msg) =>
          msg.role === "task" && msg.task.createdAt === state.activeTask?.createdAt
            ? { ...msg, task: updatedTask }
            : msg
        ),
      };
    });
  },

  // 取消任务
  cancelTask: () => {
    set((state) => {
      if (!state.activeTask) return { activeTask: null };
      const updatedTask = { ...state.activeTask, status: "cancelled" as const };
      return {
        activeTask: null,
        chatHistory: state.chatHistory.map((msg) =>
          msg.role === "task" && msg.task.createdAt === state.activeTask?.createdAt
            ? { ...msg, task: updatedTask }
            : msg
        ),
      };
    });
  },

  // 切换上下文增强
  toggleContextEnhancement: (enabled) => {
    set((state) => ({
      contextEnhancementEnabled:
        enabled !== undefined ? enabled : !state.contextEnhancementEnabled,
    }));
  },

  // 设置加载状态
  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  // 设置流式状态
  setStreaming: (streaming) => {
    set({ isStreaming: streaming });
    if (!streaming) {
      // 流式结束时处理
      const { streamingContent, activeTask } = get();
      // 只有普通聊天才将流式内容添加到历史
      if (streamingContent && !activeTask) {
        set((state) => ({
          chatHistory: [
            ...state.chatHistory,
            { role: "assistant" as const, content: streamingContent },
          ],
          streamingContent: "",
          hasUnreadMessage: !state.isChatWindowOpen,
        }));
      } else {
        // 任务模式：只清空流式内容
        set({ streamingContent: "" });
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
