/**
 * AI 功能相关类型定义
 */

/**
 * AI 功能枚举
 */
export type AIFunction =
  | "polish" // 润色
  | "expand" // 扩写
  | "compress" // 缩写
  | "continue" // 续写
  | "plan" // 规划
  | "summarize" // 总结
  | "chat"; // 聊天

/**
 * 功能分类
 */
export type FunctionCategory = "modify" | "generate" | "chat";

/**
 * 功能元信息
 */
export interface FunctionMeta {
  id: AIFunction;
  name: string;
  description: string;
  category: FunctionCategory;
  /** 是否需要选中文本 */
  requiresSelection: boolean;
  /** 是否支持流式输出 */
  supportsStreaming: boolean;
  /** 是否需要结构化输出（JSON） */
  structuredOutput: boolean;
}

/**
 * 所有功能的元信息
 */
export const AI_FUNCTIONS: Record<AIFunction, FunctionMeta> = {
  // 修改类
  polish: {
    id: "polish",
    name: "润色",
    description: "提升文学性和可读性",
    category: "modify",
    requiresSelection: true,
    supportsStreaming: true,
    structuredOutput: true,
  },
  expand: {
    id: "expand",
    name: "扩写",
    description: "丰富细节和描写",
    category: "modify",
    requiresSelection: true,
    supportsStreaming: true,
    structuredOutput: true,
  },
  compress: {
    id: "compress",
    name: "缩写",
    description: "精简内容，保留核心",
    category: "modify",
    requiresSelection: true,
    supportsStreaming: true,
    structuredOutput: true,
  },
  // 生成类
  continue: {
    id: "continue",
    name: "续写",
    description: "接续当前内容继续创作",
    category: "generate",
    requiresSelection: false,
    supportsStreaming: true,
    structuredOutput: false,
  },
  plan: {
    id: "plan",
    name: "规划",
    description: "根据大纲生成场景摘要",
    category: "generate",
    requiresSelection: false,
    supportsStreaming: true,
    structuredOutput: false,
  },
  summarize: {
    id: "summarize",
    name: "总结",
    description: "根据内容生成摘要",
    category: "generate",
    requiresSelection: false,
    supportsStreaming: true,
    structuredOutput: false,
  },
  // 聊天类
  chat: {
    id: "chat",
    name: "对话",
    description: "自由对话",
    category: "chat",
    requiresSelection: false,
    supportsStreaming: true,
    structuredOutput: false,
  },
};

/**
 * 获取功能元信息
 */
export function getFunctionMeta(func: AIFunction): FunctionMeta {
  return AI_FUNCTIONS[func];
}

/**
 * 判断是否为修改类功能
 */
export function isModifyFunction(func: AIFunction): boolean {
  return AI_FUNCTIONS[func].category === "modify";
}

/**
 * 判断是否为生成类功能
 */
export function isGenerateFunction(func: AIFunction): boolean {
  return AI_FUNCTIONS[func].category === "generate";
}

/**
 * 获取某分类下的所有功能
 */
export function getFunctionsByCategory(category: FunctionCategory): FunctionMeta[] {
  return Object.values(AI_FUNCTIONS).filter((f) => f.category === category);
}
