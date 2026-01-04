/**
 * 上下文格式化工具
 * 将用户添加的上下文格式化为可读的文本
 */

import type { UserContextItem } from "@/lib/ai/types";

/**
 * 格式化单个上下文项
 */
function formatContextItem(item: UserContextItem, index: number): string {
  switch (item.type) {
    case "node":
      return `### ${index + 1}. 章节/场景：${item.title}

${item.content}`;

    case "selection":
      return `### ${index + 1}. 选中文本

${item.text}`;

    case "entity":
      return `### ${index + 1}. ${item.name}（实体）

${item.description}`;

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
