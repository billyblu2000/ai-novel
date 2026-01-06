/**
 * AI 类型定义统一导出
 */

// 功能相关
export {
  type AIFunction,
  type FunctionCategory,
  type FunctionMeta,
  AI_FUNCTIONS,
  getFunctionMeta,
  isModifyFunction,
  isGenerateFunction,
  getFunctionsByCategory,
} from "./function";

// 上下文相关
export {
  type NodeInfo,
  type ModifyEnhancedContext,
  type UserContextItem,
  type ProjectInfo,
  type NodeContext,
  type EntityBrief,
  type AIContext,
} from "./context";

// Provider 相关
export {
  type MessageRole,
  type AIModel,
  type ProviderConfig,
  type ChatParams,
  type ChatResponse,
  type AIProvider,
} from "./provider";
// 旧的 ChatMessage 类型重命名为 ProviderMessage（用于 API 调用）
export type { ChatMessage as ProviderMessage } from "./provider";

// 设置相关
export {
  type ProviderSettings,
  type GeminiProviderSettings,
  type FunctionModelConfig,
  type AISettings,
  DEFAULT_AI_SETTINGS,
} from "./settings";

// 消息相关（新的统一消息类型）
export {
  // 消息类型
  type TextMessage,
  type SpecialRequestMessage,
  type SpecialResultMessage,
  type ChatMessage,
  // 功能类型
  type SpecialFunctionType,
  type ModifyFunctionType,
  type GenerateFunctionType,
  // Payload 类型
  type ModifyPayload,
  type PlanPayload,
  type ContinuePayload,
  type SummarizePayload,
  type SpecialPayloadMap,
  // 结果类型
  type ModifyResult,
  type PlanResult,
  type ContinueResult,
  type SummarizeResult,
  type SpecialResultMap,
  // 类型守卫
  isTextMessage,
  isSpecialRequestMessage,
  isSpecialResultMessage,
  isModifyFunctionType,
  isGenerateFunctionType,
  // 工具函数
  generateMessageId,
  createTextMessage,
  createSpecialRequestMessage,
  createSpecialResultMessage,
  // 常量
  SPECIAL_FUNCTION_NAMES,
  getSpecialFunctionName,
} from "./message";
