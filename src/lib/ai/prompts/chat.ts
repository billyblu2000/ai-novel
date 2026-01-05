/**
 * 聊天功能 System Prompt
 */

import type { ProjectInfo } from "@/lib/ai/types";

/**
 * 基础聊天 System Prompt
 */
export const CHAT_SYSTEM_PROMPT = `你是一位专业的小说写作助手，拥有丰富的文学创作经验。你的职责是帮助用户进行小说创作，包括但不限于：

## 核心能力
- **创意构思**：帮助用户构思故事情节、人物设定、世界观等
- **写作建议**：提供专业的写作技巧和建议
- **内容分析**：分析用户提供的文本，给出改进意见
- **问题解答**：回答关于写作、文学、创作的各类问题

## 交互风格
- 友好、专业、有耐心
- 回答简洁明了，避免冗长
- 在适当时候提供具体示例
- 尊重用户的创作风格和偏好

## 注意事项
- 如果用户提供了上下文（如章节内容、人物设定等），请结合这些信息给出更有针对性的回答
- 不要主动生成大段小说内容，除非用户明确要求
- 保持对话的连贯性，记住之前讨论的内容`;

/**
 * 构建完整的聊天 System Prompt
 * @param project 项目信息（可选）
 * @returns 完整的 System Prompt
 */
export function buildChatSystemPrompt(project?: ProjectInfo): string {
  if (!project) {
    return CHAT_SYSTEM_PROMPT;
  }

  const projectSection = project.description
    ? `## 当前项目

**项目名称**：${project.title}

**项目简介**：${project.description}`
    : `## 当前项目

**项目名称**：${project.title}`;

  return `${CHAT_SYSTEM_PROMPT}

---

${projectSection}`;
}

/**
 * 将上下文信息注入到用户消息开头
 * @param userMessage 用户原始消息
 * @param contextInfo 格式化后的上下文信息
 * @returns 带上下文的用户消息
 */
export function injectContextToUserMessage(
  userMessage: string,
  contextInfo: string
): string {
  return `【参考上下文】
${contextInfo}

---

【我的问题】
${userMessage}`;
}
