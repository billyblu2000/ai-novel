/**
 * 上下文格式化工具
 * 将用户添加的上下文格式化为可读的文本
 */

import type { UserContextItem } from "@/lib/ai/types";

// 实体类型中文映射
const ENTITY_TYPE_LABELS: Record<string, string> = {
  CHARACTER: "角色",
  LOCATION: "地点",
  ITEM: "物品",
};

/**
 * 格式化属性对象为可读文本
 */
function formatAttributes(attributes: Record<string, unknown>): string {
  if (!attributes || Object.keys(attributes).length === 0) {
    return "";
  }

  const lines: string[] = [];
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined && value !== "") {
      // 处理不同类型的值
      if (typeof value === "object") {
        lines.push(`- ${key}: ${JSON.stringify(value)}`);
      } else {
        lines.push(`- ${key}: ${value}`);
      }
    }
  }

  return lines.length > 0 ? `\n**属性**:\n${lines.join("\n")}` : "";
}

/**
 * 格式化单个上下文项
 */
function formatContextItem(item: UserContextItem, index: number): string {
  switch (item.type) {
    case "node": {
      const isFolder = item.nodeType === "FOLDER";
      const typeLabel = isFolder ? "章节" : "场景";
      const icon = isFolder ? "📁" : "📄";

      let result = `### ${index + 1}. ${icon} ${typeLabel}：${item.title}`;

      // 添加摘要
      if (item.summary) {
        result += `\n\n**摘要**: ${item.summary}`;
      }

      // 场景：添加故事时间
      if (!isFolder && item.timestamp) {
        result += `\n\n**故事时间**: ${item.timestamp}`;
      }

      // 章节：添加子节点列表
      if (isFolder && item.childrenNames && item.childrenNames.length > 0) {
        result += `\n\n**包含内容**:\n${item.childrenNames.map((name) => `- ${name}`).join("\n")}`;
      }

      // 添加正文内容（如果有）
      if (item.content) {
        result += `\n\n**正文**:\n${item.content}`;
      }

      return result;
    }

    case "selection":
      return `### ${index + 1}. ✂️ 选中文本

${item.text}`;

    case "entity": {
      const typeLabel = ENTITY_TYPE_LABELS[item.entityType] || item.entityType;

      let result = `### ${index + 1}. ${item.name}（${typeLabel}）`;

      // 添加别名
      if (item.aliases && item.aliases.length > 0) {
        result += `\n\n**别名**: ${item.aliases.join("、")}`;
      }

      // 添加描述
      if (item.description) {
        result += `\n\n**描述**: ${item.description}`;
      }

      // 添加属性
      const attributesText = formatAttributes(item.attributes);
      if (attributesText) {
        result += attributesText;
      }

      return result;
    }

    default:
      return "";
  }
}

/**
 * 格式化用户上下文列表
 * @param contexts 用户上下文列表
 * @returns 格式化后的文本，如果没有上下文则返回 undefined
 */
export function formatUserContexts(
  contexts: UserContextItem[]
): string | undefined {
  if (!contexts || contexts.length === 0) {
    return undefined;
  }

  const formatted = contexts
    .map((item, index) => formatContextItem(item, index))
    .filter(Boolean)
    .join("\n\n---\n\n");

  return formatted || undefined;
}

/**
 * 格式化选中文本（用于修改功能）
 * @param selectedText 选中的文本
 * @returns 格式化后的文本
 */
export function formatSelectedText(selectedText: string): string {
  return `## 需要处理的文本

\`\`\`
${selectedText}
\`\`\``;
}

/**
 * 修改功能的增强上下文
 */
export interface ModifyEnhancedContextInput {
  /** 选中文本的前文 */
  textBefore?: string;
  /** 选中文本的后文 */
  textAfter?: string;
  /** 当前场景摘要 */
  sceneSummary?: string;
  /** 当前章节摘要 */
  chapterSummary?: string;
}

/**
 * 格式化修改功能的增强上下文
 * @param context 增强上下文
 * @returns 格式化后的文本，如果没有上下文则返回 undefined
 */
export function formatModifyEnhancedContext(
  context: ModifyEnhancedContextInput
): string | undefined {
  const parts: string[] = [];

  // 章节摘要
  if (context.chapterSummary) {
    parts.push(`**当前章节摘要**：${context.chapterSummary}`);
  }

  // 场景摘要
  if (context.sceneSummary) {
    parts.push(`**当前场景摘要**：${context.sceneSummary}`);
  }

  // 前文
  if (context.textBefore) {
    parts.push(`**前文**：\n${context.textBefore}`);
  }

  // 后文
  if (context.textAfter) {
    parts.push(`**后文**：\n${context.textAfter}`);
  }

  if (parts.length === 0) return undefined;

  return parts.join("\n\n");
}
