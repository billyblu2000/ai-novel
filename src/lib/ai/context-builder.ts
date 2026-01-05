/**
 * 上下文构建器
 * 用于构建 AI 请求所需的上下文信息
 */

import type {
  AIContext,
  UserContextItem,
  NodeContext,
  EntityBrief,
  ProjectInfo,
} from "@/lib/ai/types";

/**
 * 上下文构建器配置
 */
export interface ContextBuilderConfig {
  /** 项目信息 */
  project?: ProjectInfo;
  /** 当前节点信息 */
  currentNode?: NodeContext;
  /** 用户手动添加的上下文 */
  userContexts?: UserContextItem[];
  /** 相关实体 */
  relatedEntities?: EntityBrief[];
  /** 前文摘要 */
  previousSummaries?: string[];
}

/**
 * 构建 AI 上下文
 * 整合所有上下文信息，供 AI 请求使用
 */
export function buildAIContext(config: ContextBuilderConfig): AIContext {
  return {
    project: config.project,
    currentNode: config.currentNode,
    userContexts: config.userContexts || [],
    relatedEntities: config.relatedEntities || [],
    previousSummaries: config.previousSummaries || [],
  };
}

/**
 * 从节点数据构建 NodeContext
 */
export interface NodeData {
  id: string;
  title: string;
  type: "FOLDER" | "FILE";
  content?: string | null;
  summary?: string | null;
  timestamp?: string | null;
  children?: { title: string }[];
}

export function buildNodeContext(node: NodeData): NodeContext {
  return {
    id: node.id,
    title: node.title,
    type: node.type,
    content: node.content || "",
    summary: node.summary || "",
  };
}

/**
 * 从节点数据构建 UserContextItem (node 类型)
 */
export function buildNodeContextItem(node: NodeData): UserContextItem {
  const baseItem = {
    type: "node" as const,
    nodeId: node.id,
    title: node.title,
    nodeType: node.type,
    content: node.content || "",
    summary: node.summary || "",
  };

  if (node.type === "FILE") {
    return {
      ...baseItem,
      timestamp: node.timestamp,
    };
  } else {
    return {
      ...baseItem,
      childrenNames: node.children?.map((c) => c.title) || [],
    };
  }
}

/**
 * 从实体数据构建 UserContextItem (entity 类型)
 */
export interface EntityData {
  id: string;
  name: string;
  type: "CHARACTER" | "LOCATION" | "ITEM";
  aliases?: string[];
  description?: string | null;
  attributes?: Record<string, unknown> | null;
}

export function buildEntityContextItem(entity: EntityData): UserContextItem {
  return {
    type: "entity",
    entityId: entity.id,
    entityType: entity.type,
    name: entity.name,
    aliases: entity.aliases || [],
    description: entity.description || "",
    attributes: entity.attributes || {},
  };
}

/**
 * 从选中文本构建 UserContextItem (selection 类型)
 */
export function buildSelectionContextItem(text: string): UserContextItem {
  return {
    type: "selection",
    text,
  };
}

/**
 * 合并多个上下文来源
 * 去重并按优先级排序
 */
export function mergeContexts(
  ...contextArrays: (UserContextItem[] | undefined)[]
): UserContextItem[] {
  const merged: UserContextItem[] = [];
  const seenIds = new Set<string>();

  for (const contexts of contextArrays) {
    if (!contexts) continue;

    for (const context of contexts) {
      // 生成唯一标识
      let id: string;
      switch (context.type) {
        case "node":
          id = `node:${context.nodeId}`;
          break;
        case "entity":
          id = `entity:${context.entityId}`;
          break;
        case "selection":
          // 选段使用内容的前 50 字符作为标识
          id = `selection:${context.text.slice(0, 50)}`;
          break;
      }

      // 去重
      if (!seenIds.has(id)) {
        seenIds.add(id);
        merged.push(context);
      }
    }
  }

  return merged;
}

/**
 * 检查上下文是否为空
 */
export function isContextEmpty(context: AIContext): boolean {
  return (
    !context.currentNode &&
    context.userContexts.length === 0 &&
    context.relatedEntities.length === 0 &&
    context.previousSummaries.length === 0
  );
}

/**
 * 计算上下文的大致 token 数（粗略估算）
 * 中文约 1.5 字符/token，英文约 4 字符/token
 * 这里使用保守估计：1 字符 ≈ 0.5 token
 */
export function estimateContextTokens(context: AIContext): number {
  let totalChars = 0;

  // 当前节点
  if (context.currentNode) {
    totalChars += context.currentNode.title.length;
    totalChars += context.currentNode.content.length;
    totalChars += context.currentNode.summary.length;
  }

  // 用户上下文
  for (const item of context.userContexts) {
    switch (item.type) {
      case "node":
        totalChars += item.title.length;
        totalChars += item.content.length;
        totalChars += item.summary.length;
        break;
      case "selection":
        totalChars += item.text.length;
        break;
      case "entity":
        totalChars += item.name.length;
        totalChars += item.description.length;
        totalChars += JSON.stringify(item.attributes).length;
        break;
    }
  }

  // 相关实体
  for (const entity of context.relatedEntities) {
    totalChars += entity.name.length;
    totalChars += entity.description.length;
  }

  // 前文摘要
  for (const summary of context.previousSummaries) {
    totalChars += summary.length;
  }

  // 粗略估算 token 数
  return Math.ceil(totalChars * 0.5);
}

/**
 * 截断上下文以适应 token 限制
 * @param context 原始上下文
 * @param maxTokens 最大 token 数
 * @returns 截断后的上下文
 */
export function truncateContext(
  context: AIContext,
  maxTokens: number
): AIContext {
  const currentTokens = estimateContextTokens(context);

  if (currentTokens <= maxTokens) {
    return context;
  }

  // 简单策略：按比例截断内容
  const ratio = maxTokens / currentTokens;

  const truncated: AIContext = {
    ...context,
    userContexts: context.userContexts.map((item) => {
      switch (item.type) {
        case "node":
          return {
            ...item,
            content: truncateText(item.content, Math.floor(item.content.length * ratio)),
          };
        case "selection":
          return {
            ...item,
            text: truncateText(item.text, Math.floor(item.text.length * ratio)),
          };
        case "entity":
          return {
            ...item,
            description: truncateText(
              item.description,
              Math.floor(item.description.length * ratio)
            ),
          };
      }
    }),
    previousSummaries: context.previousSummaries.map((s) =>
      truncateText(s, Math.floor(s.length * ratio))
    ),
  };

  if (truncated.currentNode) {
    truncated.currentNode = {
      ...truncated.currentNode,
      content: truncateText(
        truncated.currentNode.content,
        Math.floor(truncated.currentNode.content.length * ratio)
      ),
    };
  }

  return truncated;
}

/**
 * 截断文本，保留前后部分
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  if (maxLength < 50) {
    return text.slice(0, maxLength);
  }

  // 保留前 60% 和后 30%，中间用省略号
  const frontLength = Math.floor(maxLength * 0.6);
  const backLength = Math.floor(maxLength * 0.3);

  return (
    text.slice(0, frontLength) +
    "\n...[内容已截断]...\n" +
    text.slice(-backLength)
  );
}
