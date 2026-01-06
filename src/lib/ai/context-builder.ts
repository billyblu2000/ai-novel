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
  PlanPayload,
  ContinuePayload,
  SummarizePayload,
} from "@/lib/ai/types";
import type { Entity, Node } from "@/types";

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

/**
 * 构建规划功能上下文的参数
 */
export interface BuildPlanContextParams {
  /** 当前节点 */
  currentNode: Node;
  /** 所有节点列表（用于查找子节点和父节点） */
  allNodes: Node[];
  /** 项目信息（用于根节点的父节点信息） */
  projectInfo?: ProjectInfo | null;
  /** 是否启用上下文增强 */
  enhanceContext?: boolean;
  /** 实体列表（用于关联实体） */
  entities?: Entity[];
}

/**
 * 构建规划功能的上下文
 * 返回 PlanPayload 类型（不含 nodeId）
 */
export function buildPlanContext(params: BuildPlanContextParams): Omit<PlanPayload, "nodeId"> {
  const {
    currentNode,
    allNodes,
    projectInfo,
    enhanceContext = false,
    entities = [],
  } = params;

  // 获取已有子节点
  const existingChildren = allNodes
    .filter((n) => n.parent_id === currentNode.id)
    .sort((a, b) => a.order.localeCompare(b.order))
    .map((child) => ({
      title: child.title,
      summary: child.type === "FILE" ? (child.summary || "") : (child.outline || ""),
      type: child.type as "FOLDER" | "FILE",
    }));

  const context: Omit<PlanPayload, "nodeId"> = {
    nodeName: currentNode.title,
    nodeOutline: currentNode.outline || "",
    existingChildren,
  };

  // 上下文增强：添加父节点信息
  if (enhanceContext) {
    if (currentNode.parent_id) {
      const parentNode = allNodes.find((n) => n.id === currentNode.parent_id);
      if (parentNode) {
        // 检查父节点是否是系统根节点
        const parentMeta = parentNode.metadata as { system_root?: boolean; root_kind?: string } | null;
        if (parentMeta?.system_root && parentMeta?.root_kind === "MANUSCRIPT") {
          // 父节点是正文根节点，使用项目信息
          if (projectInfo) {
            context.parentNode = {
              name: projectInfo.title,
              outline: projectInfo.description || "",
            };
          }
        } else {
          // 普通父节点
          context.parentNode = {
            name: parentNode.title,
            outline: parentNode.outline || "",
          };
        }
      }
    } else if (projectInfo) {
      // 当前节点没有父节点（是顶级节点），使用项目信息
      context.parentNode = {
        name: projectInfo.title,
        outline: projectInfo.description || "",
      };
    }

    // 上下文增强：添加关联实体
    if (entities.length > 0) {
      // 从大纲文本中提取关联实体
      const relatedEntities = findRelatedEntities(
        currentNode.outline || "",
        entities
      );
      if (relatedEntities.length > 0) {
        context.relatedEntities = relatedEntities.map((e) => ({
          name: e.name,
          type: e.type,
          description: e.description || "",
        }));
      }
    }
  }

  return context;
}

/**
 * 从文本中查找关联实体
 * 使用简单的字符串匹配（名称和别名）
 */
export function findRelatedEntities(text: string, entities: Entity[]): Entity[] {
  if (!text || entities.length === 0) return [];

  const related: Entity[] = [];
  const textLower = text.toLowerCase();

  for (const entity of entities) {
    // 检查实体名称
    if (textLower.includes(entity.name.toLowerCase())) {
      related.push(entity);
      continue;
    }

    // 检查别名
    if (entity.aliases && entity.aliases.length > 0) {
      const hasAlias = entity.aliases.some((alias) =>
        textLower.includes(alias.toLowerCase())
      );
      if (hasAlias) {
        related.push(entity);
      }
    }
  }

  return related;
}

/**
 * 构建续写功能上下文的参数
 */
export interface BuildContinueContextParams {
  /** 当前节点 */
  currentNode: Node;
  /** 所有节点列表（用于查找父节点链） */
  allNodes: Node[];
  /** 项目信息 */
  projectInfo?: ProjectInfo | null;
  /** 光标位置（在纯文本中的位置） */
  cursorPosition: number;
  /** 编辑器纯文本内容 */
  editorTextContent: string;
  /** 实体列表（用于关联实体） */
  entities?: Entity[];
  /** 光标后内容的最大长度 */
  maxContentAfterLength?: number;
}

/**
 * 构建续写功能的上下文
 * 返回 ContinuePayload 类型（不含 nodeId）
 */
export function buildContinueContext(
  params: BuildContinueContextParams
): Omit<ContinuePayload, "nodeId"> {
  const {
    currentNode,
    allNodes,
    projectInfo,
    cursorPosition,
    editorTextContent,
    entities = [],
    maxContentAfterLength = 200,
  } = params;

  // 1. 提取光标前后内容
  const contentBefore = editorTextContent.slice(0, cursorPosition);
  const rawContentAfter = editorTextContent.slice(cursorPosition);
  const contentAfter = rawContentAfter.length > maxContentAfterLength
    ? rawContentAfter.slice(0, maxContentAfterLength)
    : rawContentAfter;

  // 2. 构建父节点链（从根到父）
  const ancestorChain: Array<{ name: string; summary: string }> = [];
  
  // 辅助函数：检查是否是系统根节点
  const isSystemRoot = (node: Node): boolean => {
    const meta = node.metadata as { system_root?: boolean } | null;
    return !!meta?.system_root;
  };

  // 向上遍历父节点
  let currentParentId = currentNode.parent_id;
  while (currentParentId) {
    const parentNode = allNodes.find((n) => n.id === currentParentId);
    if (!parentNode) break;

    // 跳过系统根节点
    if (isSystemRoot(parentNode)) {
      break;
    }

    // 添加到链的开头（因为我们是从下往上遍历）
    ancestorChain.unshift({
      name: parentNode.title,
      summary: parentNode.type === "FILE" 
        ? (parentNode.summary || "") 
        : (parentNode.outline || ""),
    });

    currentParentId = parentNode.parent_id;
  }

  // 如果有项目信息，添加到链的最前面
  if (projectInfo) {
    ancestorChain.unshift({
      name: projectInfo.title,
      summary: projectInfo.description || "",
    });
  }

  // 3. 构建基础上下文
  const context: Omit<ContinuePayload, "nodeId"> = {
    nodeName: currentNode.title,
    nodeSummary: currentNode.summary || undefined,
    contentBefore,
    contentAfter: contentAfter.trim() || undefined,
    ancestorChain,
  };

  // 4. 提取关联实体（从摘要和正文中）
  if (entities.length > 0) {
    const textToSearch = [
      currentNode.summary || "",
      editorTextContent,
    ].join(" ");

    const relatedEntities = findRelatedEntities(textToSearch, entities);
    if (relatedEntities.length > 0) {
      context.relatedEntities = relatedEntities.map((e) => ({
        name: e.name,
        type: e.type,
        description: e.description || "",
      }));
    }
  }

  return context;
}

/**
 * 构建总结功能上下文的参数
 */
export interface BuildSummarizeContextParams {
  /** 当前节点 */
  currentNode: Node;
  /** 所有节点列表（用于查找子节点） */
  allNodes: Node[];
  /** 文档的正文内容（仅当节点为 FILE 时需要） */
  fileContent?: string;
}

/**
 * 构建总结功能的上下文
 * 返回 SummarizePayload 类型（不含 nodeId）
 */
export function buildSummarizeContext(
  params: BuildSummarizeContextParams
): Omit<SummarizePayload, "nodeId"> {
  const { currentNode, allNodes, fileContent } = params;

  const nodeType = currentNode.type as "FOLDER" | "FILE";
  let content: string;

  if (nodeType === "FILE") {
    // 文档：使用正文内容
    content = fileContent || currentNode.content || "";
  } else {
    // 文件夹：构建子节点信息
    const children = allNodes
      .filter((n) => n.parent_id === currentNode.id)
      .sort((a, b) => a.order.localeCompare(b.order));

    if (children.length === 0) {
      content = "（暂无子内容）";
    } else {
      const childrenInfo = children.map((child, index) => {
        const typeLabel = child.type === "FOLDER" ? "章节" : "场景";
        const summary = child.type === "FILE" 
          ? (child.summary || "无摘要") 
          : (child.outline || "无大纲");
        return `${index + 1}. 【${typeLabel}】${child.title}\n   摘要：${summary}`;
      });
      content = childrenInfo.join("\n\n");
    }
  }

  return {
    nodeName: currentNode.title,
    nodeType,
    content,
    currentSummary: nodeType === "FILE" ? currentNode.summary : currentNode.outline,
  };
}
