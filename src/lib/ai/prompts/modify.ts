/**
 * 修改功能 Prompt 模板
 * 包含润色、扩写、缩写三个功能
 */

import type { ProjectInfo } from "@/lib/ai/types";

/**
 * 修改功能的结构化输出格式
 */
export interface ModifyResult {
  /** 修改后的文本 */
  result: string;
  /** 修改说明（可选） */
  explanation?: string;
}

/**
 * 修改功能基础 System Prompt
 */
const MODIFY_BASE_PROMPT = `你是一位专业的小说写作助手，专注于文本修改和优化。

## 输出格式要求
你必须以 JSON 格式输出，包含以下字段：
- result: 修改后的完整文本（必需）
- explanation: 简短的修改说明，说明主要做了哪些改动（可选，建议提供）

示例输出：
\`\`\`json
{
  "result": "修改后的文本内容...",
  "explanation": "优化了句式结构，增强了画面感..."
}
\`\`\`

## 注意事项
- 只输出 JSON，不要有其他内容
- 保持原文的核心意思和风格
- 如果用户提供了上下文，请结合上下文进行修改`;

/**
 * 润色功能 System Prompt
 */
export const POLISH_SYSTEM_PROMPT = `${MODIFY_BASE_PROMPT}

## 润色任务说明
你的任务是**润色**用户提供的文本：
- 提升文学性和可读性
- 优化句式结构和节奏感
- 增强语言的表现力和感染力
- 修正语法和用词问题
- 保持原文的情感基调和叙事风格
- **不要增加或删除内容**，只优化表达`;

/**
 * 扩写功能 System Prompt
 */
export const EXPAND_SYSTEM_PROMPT = `${MODIFY_BASE_PROMPT}

## 扩写任务说明
你的任务是**扩写**用户提供的文本：
- 丰富细节描写（环境、动作、心理等）
- 增加感官描写（视觉、听觉、触觉等）
- 深化人物情感和内心活动
- 扩展对话和互动
- 保持原文的情节走向和风格
- 扩写后的内容应该是原文的 **1.5-2 倍**长度`;

/**
 * 缩写功能 System Prompt
 */
export const COMPRESS_SYSTEM_PROMPT = `${MODIFY_BASE_PROMPT}

## 缩写任务说明
你的任务是**缩写**用户提供的文本：
- 精简冗余的描写和修饰
- 保留核心情节和关键信息
- 删除不必要的重复和赘述
- 保持文章的连贯性和可读性
- 保留原文的情感基调
- 缩写后的内容应该是原文的 **50-70%** 长度`;

/**
 * 根据功能类型获取对应的 System Prompt
 */
export function getModifySystemPrompt(
  functionType: "polish" | "expand" | "compress",
  project?: ProjectInfo
): string {
  let basePrompt: string;

  switch (functionType) {
    case "polish":
      basePrompt = POLISH_SYSTEM_PROMPT;
      break;
    case "expand":
      basePrompt = EXPAND_SYSTEM_PROMPT;
      break;
    case "compress":
      basePrompt = COMPRESS_SYSTEM_PROMPT;
      break;
  }

  // 如果有项目信息，添加到 System Prompt
  if (project) {
    const projectSection = project.description
      ? `\n\n---\n\n## 当前项目\n\n**项目名称**：${project.title}\n\n**项目简介**：${project.description}`
      : `\n\n---\n\n## 当前项目\n\n**项目名称**：${project.title}`;

    return basePrompt + projectSection;
  }

  return basePrompt;
}

/**
 * 构建修改功能的用户消息
 * @param selectedText 选中的文本
 * @param contextInfo 格式化后的上下文信息（可选）
 * @param userInstruction 用户额外指令（可选）
 */
export function buildModifyUserMessage(
  selectedText: string,
  contextInfo?: string,
  userInstruction?: string
): string {
  let message = "";

  // 添加上下文
  if (contextInfo) {
    message += `【参考上下文】\n${contextInfo}\n\n---\n\n`;
  }

  // 添加需要修改的文本
  message += `【需要处理的文本】\n${selectedText}`;

  // 添加用户额外指令
  if (userInstruction) {
    message += `\n\n---\n\n【额外要求】\n${userInstruction}`;
  }

  return message;
}

/**
 * 解析修改功能的 JSON 输出
 * @param content AI 返回的内容
 * @returns 解析后的结果，如果解析失败则返回原始内容作为 result
 */
export function parseModifyResult(content: string): ModifyResult {
  try {
    // 尝试直接解析 JSON
    const parsed = JSON.parse(content);
    if (parsed.result) {
      return {
        result: parsed.result,
        explanation: parsed.explanation,
      };
    }
  } catch {
    // 尝试从 markdown 代码块中提取 JSON
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.result) {
          return {
            result: parsed.result,
            explanation: parsed.explanation,
          };
        }
      } catch {
        // 解析失败
      }
    }
  }

  // 如果解析失败，将整个内容作为结果返回
  return {
    result: content.trim(),
  };
}
