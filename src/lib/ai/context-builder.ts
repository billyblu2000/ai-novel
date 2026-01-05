/**
 * AI 上下文构建器
 * 集中管理上下文的构建和处理逻辑
 */

import type {
  ModifyEnhancedContext,
  NodeInfo,
  UserContextItem,
  ProjectInfo,
  AIContext,
} from "@/lib/ai/types";
import type { Entity } from "@/types";

/**
 * 构建增强上下文的参数
 */
export interface BuildEnhancedContextParams {
  /** 编辑器完整内容 */
  editorContent?: string;
  /** 选中文本的起始位置 */
  selectionStart?: number;
  /** 选中文本的结束位置 */
  selectionEnd?: number;
  /** 当前场景节点 */
  currentNode?: NodeInfo | null;
  /** 父章节节点 */
  parentNode?: NodeInfo | null;
  /** 选中文本中的实体 ID 列表 */
  mentionedEntityIds?: string[];
  /** 前后文最大长度 */
  maxContextLength?: number;
}

/**
 * 构建修改功能的增强上下文
 */
export function buildModifyEnhancedContext(
  params: BuildEnhancedContextParams
): ModifyEnhancedContext | null {
  const {
    editorContent,
    selectionStart,
    selectionEnd,
    currentNode,
    parentNode,
    mentionedEntityIds,
    maxContextLength = 200,
  } = params;

  const context: ModifyEnhancedContext = {};

  // 1. 提取前后文
  if (
    editorContent &&
    selectionStart !== undefined &&
    selectionEnd !== undefined
  ) {
    // 前文：从选中位置往前取
    const beforeStart = Math.max(0, selectionStart - maxContextLength);
    const textBefore = editorContent.slice(beforeStart, selectionStart).trim();
    if (textBefore) {
      context.textBefore = textBefore;
    }

    // 后文：从选中位置往后取
    const afterEnd = Math.min(editorContent.length, selectionEnd + maxContextLength);
    const textAfter = editorContent.slice(selectionEnd, afterEnd).trim();
    if (textAfter) {
      context.textAfter = textAfter;
    }
  }

  // 2. 当前场景摘要
  if (currentNode?.summary) {
    context.sceneSummary = currentNode.summary;
  }

  // 3. 当前章节摘要
  if (parentNode?.summary) {
    context.chapterSummary = parentNode.summary;
  }

  // 4. 关联实体 ID
  if (mentionedEntityIds && mentionedEntityIds.length > 0) {
    context.relatedEntityIds = mentionedEntityIds;
  }

  // 如果没有任何增强信息，返回 null
  if (Object.keys(context).length === 0) return null;

  return context;
}

/**
 * 构建完整 AI 上下文的参数
 */
export interface BuildAIContextParams {
  /** 项目信息 */
  project?: ProjectInfo | null;
  /** 用户上下文列表 */
  userContexts?: UserContextItem[];
}

/**
 * 构建完整的 AI 上下文
 */
export function buildAIContext(params: BuildAIContextParams): AIContext {
  const { project, userContexts = [] } = params;

  return {
    project: project || undefined,
    userContexts,
    relatedEntities: [],
    previousSummaries: [],
  };
}

/**
 * 从实体列表中提取用户上下文
 */
export function entitiesToUserContexts(
  entities: Entity[],
  entityIds: string[]
): UserContextItem[] {
  return entityIds
    .map((id) => entities.find((e) => e.id === id))
    .filter((entity): entity is Entity => entity !== undefined)
    .map((entity) => ({
      type: "entity" as const,
      entityId: entity.id,
      entityType: entity.type,
      name: entity.name,
      aliases: entity.aliases,
      description: entity.description,
      attributes: entity.attributes,
    }));
}

/**
 * 创建选中文本的用户上下文
 */
export function selectionToUserContext(text: string): UserContextItem {
  return {
    type: "selection",
    text,
  };
}
