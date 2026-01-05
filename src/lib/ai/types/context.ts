/**
 * AI 上下文相关类型定义
 * 统一管理所有上下文相关的类型
 */

/**
 * 简化的节点信息（用于 AI 上下文）
 */
export interface NodeInfo {
  id: string;
  title: string;
  summary?: string;
}

/**
 * 修改功能的增强上下文
 */
export interface ModifyEnhancedContext {
  /** 选中文本的前文 */
  textBefore?: string;
  /** 选中文本的后文 */
  textAfter?: string;
  /** 当前场景摘要 */
  sceneSummary?: string;
  /** 当前章节摘要 */
  chapterSummary?: string;
  /** 关联的实体 ID 列表 */
  relatedEntityIds?: string[];
}

/**
 * 用户添加的上下文项
 */
export type UserContextItem =
  | {
      type: "node";
      nodeId: string;
      title: string;
      nodeType: "FOLDER" | "FILE";
      content: string;
      summary: string;
      /** 场景的故事时间 (FILE) */
      timestamp?: string | null;
      /** 章节的子节点名称列表 (FOLDER) */
      childrenNames?: string[];
    }
  | { type: "selection"; text: string }
  | {
      type: "entity";
      entityId: string;
      entityType: "CHARACTER" | "LOCATION" | "ITEM";
      name: string;
      aliases: string[];
      description: string;
      attributes: Record<string, unknown>;
    };

/**
 * 项目信息（用于 System Prompt）
 */
export interface ProjectInfo {
  title: string;
  description?: string | null;
}

/**
 * 节点上下文
 */
export interface NodeContext {
  id: string;
  title: string;
  content: string;
  summary: string;
  type: "FOLDER" | "FILE";
}

/**
 * 实体简要信息（用于上下文）
 */
export interface EntityBrief {
  id: string;
  name: string;
  type: "CHARACTER" | "LOCATION" | "ITEM";
  description: string;
}

/**
 * AI 上下文（完整）
 */
export interface AIContext {
  /** 项目信息 */
  project?: ProjectInfo;
  /** 当前节点信息 */
  currentNode?: NodeContext;
  /** 用户手动添加的上下文 */
  userContexts: UserContextItem[];
  /** 相关实体 */
  relatedEntities: EntityBrief[];
  /** 前文摘要 */
  previousSummaries: string[];
}
