/**
 * 统一的 System Prompt 和任务描述模板
 * 
 * 重构后的架构：
 * - 所有功能共用一个通用的 System Prompt
 * - 特殊功能的指令注入到用户消息中
 */

import type { ProjectInfo, UserContextItem, SpecialFunctionType } from "@/lib/ai/types";
import type { ModifyPayload, PlanPayload, ContinuePayload, SummarizePayload } from "@/lib/ai/types/message";

/**
 * 统一的 System Prompt
 * 设计为足够通用，能处理普通对话和特殊任务
 */
export const UNIFIED_SYSTEM_PROMPT = `你是一位专业的小说写作助手，拥有丰富的文学创作经验和深厚的文学素养。

## 核心能力
- **创意构思**：帮助构思故事情节、人物设定、世界观等
- **写作建议**：提供专业的写作技巧和建议
- **内容分析**：分析文本，给出改进意见
- **文本修改**：润色、扩写、缩写文本
- **结构规划**：规划章节和场景结构
- **内容生成**：续写故事、生成摘要

## 交互风格
- 友好、专业、有耐心
- 回答简洁明了，避免冗长
- 在适当时候提供具体示例
- 尊重用户的创作风格和偏好

## 任务处理
- 普通对话：自然语言回复
- 特殊任务：用户会明确标注任务类型和要求，请按指定格式输出

## 注意事项
- 结合用户提供的上下文信息给出针对性回答
- 保持对话的连贯性，记住之前讨论的内容`;

/**
 * 构建完整的统一 System Prompt
 */
export function buildUnifiedSystemPrompt(project?: ProjectInfo): string {
  if (!project) {
    return UNIFIED_SYSTEM_PROMPT;
  }

  const projectSection = project.description
    ? `\n\n---\n\n## 当前项目\n\n**项目名称**：${project.title}\n\n**项目简介**：${project.description}`
    : `\n\n---\n\n## 当前项目\n\n**项目名称**：${project.title}`;

  return UNIFIED_SYSTEM_PROMPT + projectSection;
}

/**
 * 特殊功能的任务描述模板
 */
const TASK_DESCRIPTIONS: Record<SpecialFunctionType, string> = {
  polish: `【任务类型】文本润色

你需要对提供的文本进行润色优化：
- 提升文学性和可读性
- 优化句式结构和节奏感
- 增强语言的表现力和感染力
- 修正语法和用词问题
- 保持原文的情感基调和叙事风格
- **不要增加或删除内容**，只优化表达

【输出格式】
请以 JSON 格式输出，包含以下字段：
\`\`\`json
{
  "result": "润色后的完整文本",
  "explanation": "简短的修改说明（可选）"
}
\`\`\``,

  expand: `【任务类型】文本扩写

你需要对提供的文本进行扩写：
- 丰富细节描写（环境、动作、心理等）
- 增加感官描写（视觉、听觉、触觉等）
- 深化人物情感和内心活动
- 扩展对话和互动
- 保持原文的情节走向和风格
- 扩写后的内容应该是原文的 **1.5-2 倍**长度

【输出格式】
请以 JSON 格式输出，包含以下字段：
\`\`\`json
{
  "result": "扩写后的完整文本",
  "explanation": "简短的修改说明（可选）"
}
\`\`\``,

  compress: `【任务类型】文本缩写

你需要对提供的文本进行缩写：
- 精简冗余的描写和修饰
- 保留核心情节和关键信息
- 删除不必要的重复和赘述
- 保持文章的连贯性和可读性
- 保留原文的情感基调
- 缩写后的内容应该是原文的 **50-70%** 长度

【输出格式】
请以 JSON 格式输出，包含以下字段：
\`\`\`json
{
  "result": "缩写后的完整文本",
  "explanation": "简短的修改说明（可选）"
}
\`\`\``,

  plan: `【任务类型】结构规划

你需要根据提供的章节/卷大纲，规划其子内容结构：

**规则**：
1. 理解层级：
   - 如果当前是"卷"级别，子内容应该是"章节"（FOLDER 类型）
   - 如果当前是"章节"级别，子内容应该是"场景"（FILE 类型）
   - 用户可能会指定子节点类型，请遵循用户指示

2. 保留已有内容：
   - 如果已有子节点，不要重复规划相同内容
   - 新规划的内容应该与已有内容形成完整的故事结构

3. 规划原则：
   - 每个子节点需要有明确的标题和简短摘要（50-100字）
   - 保持故事的连贯性和节奏感
   - 标题要简洁有力，能体现内容核心

【输出格式】
请以 JSON 格式输出：
\`\`\`json
{
  "children": [
    {
      "title": "子节点标题",
      "summary": "子节点摘要（50-100字）",
      "type": "FOLDER 或 FILE"
    }
  ],
  "explanation": "规划说明（可选）"
}
\`\`\``,

  continue: `【任务类型】内容续写

你需要接续当前内容继续创作。

**要求**：
- 保持与前文一致的写作风格和语气
- 延续当前的情节发展和叙事节奏
- 保持人物性格和行为的一致性
- 注意情节的连贯性和逻辑性
- 如果提供了光标后的内容，续写需要自然地衔接到后文
- 续写长度适中，约 200-500 字

**注意**：
- 仔细阅读提供的上下文信息（父节点链、场景摘要、关联角色等）
- 续写内容应该符合故事的整体设定和发展方向

**重要**：
- **不要重复已有内容**：直接从光标位置开始续写新内容，不要复述或重复【光标前的内容】中已有的任何文字
- 输出的 result 应该是纯粹的新增内容，可以直接插入到光标位置

【输出格式】
请以 JSON 格式输出：
\`\`\`json
{
  "result": "续写的内容（纯文本，不含任何标记，不要包含已有内容）",
  "explanation": "续写思路说明（可选）"
}
\`\`\``,

  summarize: `【任务类型】内容总结

你需要为提供的内容生成摘要。

**要求**：
- 概括主要情节、事件和核心内容
- 提取关键信息和重要细节
- 保持摘要的简洁性和可读性
- 摘要长度控制在 50-150 字
- 使用第三人称客观描述

**注意**：
- 如果是场景（文档），重点概括情节发展和人物行为
- 如果是章节（文件夹），重点概括各子内容的整体脉络
- 不要添加原文没有的信息

【输出格式】
请以 JSON 格式输出：
\`\`\`json
{
  "result": "生成的摘要（50-150字）",
  "explanation": "总结思路说明（可选）"
}
\`\`\``,
};

/**
 * 获取特殊功能的任务描述
 */
export function getTaskDescription(functionType: SpecialFunctionType): string {
  return TASK_DESCRIPTIONS[functionType];
}

/**
 * 格式化用户上下文为文本
 */
export function formatUserContexts(contexts: UserContextItem[]): string {
  if (!contexts || contexts.length === 0) return "";

  const sections: string[] = [];

  for (const ctx of contexts) {
    switch (ctx.type) {
      case "node":
        if (ctx.nodeType === "FILE") {
          let nodeInfo = `### 📄 ${ctx.title}`;
          if (ctx.timestamp) {
            nodeInfo += `\n**故事时间**：${ctx.timestamp}`;
          }
          if (ctx.summary) {
            nodeInfo += `\n**摘要**：${ctx.summary}`;
          }
          if (ctx.content) {
            nodeInfo += `\n**内容**：\n${ctx.content}`;
          }
          sections.push(nodeInfo);
        } else {
          let folderInfo = `### 📁 ${ctx.title}`;
          if (ctx.summary) {
            folderInfo += `\n**大纲**：${ctx.summary}`;
          }
          if (ctx.childrenNames && ctx.childrenNames.length > 0) {
            folderInfo += `\n**子节点**：\n${ctx.childrenNames.join("\n")}`;
          }
          sections.push(folderInfo);
        }
        break;

      case "selection":
        sections.push(`### ✂️ 选中文本\n${ctx.text}`);
        break;

      case "entity":
        let entityInfo = `### 👤 ${ctx.name} (${ctx.entityType})`;
        if (ctx.aliases.length > 0) {
          entityInfo += `\n**别名**：${ctx.aliases.join("、")}`;
        }
        if (ctx.description) {
          entityInfo += `\n**描述**：${ctx.description}`;
        }
        if (ctx.attributes && Object.keys(ctx.attributes).length > 0) {
          const attrs = Object.entries(ctx.attributes)
            .map(([k, v]) => `- ${k}: ${v}`)
            .join("\n");
          entityInfo += `\n**属性**：\n${attrs}`;
        }
        sections.push(entityInfo);
        break;
    }
  }

  return sections.join("\n\n");
}

/**
 * 格式化修改功能的 Payload
 */
function formatModifyPayload(payload: ModifyPayload): string {
  let result = `【需要处理的文本】\n${payload.selectedText}`;

  const ctx = payload.enhancedContext;
  if (ctx?.textBefore) {
    result = `【前文】\n${ctx.textBefore}\n\n---\n\n${result}`;
  }

  if (ctx?.textAfter) {
    result += `\n\n---\n\n【后文】\n${ctx.textAfter}`;
  }

  if (ctx?.sceneSummary) {
    result += `\n\n---\n\n【当前场景摘要】\n${ctx.sceneSummary}`;
  }

  if (ctx?.chapterSummary) {
    result += `\n\n---\n\n【当前章节摘要】\n${ctx.chapterSummary}`;
  }

  return result;
}

/**
 * 格式化规划功能的 Payload
 */
function formatPlanPayload(payload: PlanPayload): string {
  let result = `【当前节点】\n**名称**：${payload.nodeName}\n\n**大纲**：\n${payload.nodeOutline}`;

  if (payload.existingChildren && payload.existingChildren.length > 0) {
    const childrenList = payload.existingChildren
      .map(
        (child, index) =>
          `${index + 1}. **${child.title}** (${child.type === "FOLDER" ? "章节" : "场景"})\n   摘要：${child.summary || "无"}`
      )
      .join("\n\n");
    result += `\n\n---\n\n【已有子节点】\n${childrenList}\n\n请在已有子节点的基础上，规划还需要添加的子节点。`;
  }

  if (payload.parentNode) {
    result += `\n\n---\n\n【上级节点信息】\n**名称**：${payload.parentNode.name}\n**大纲**：${payload.parentNode.outline}`;
  }

  if (payload.relatedEntities && payload.relatedEntities.length > 0) {
    const entitiesList = payload.relatedEntities
      .map((entity) => `- **${entity.name}** (${entity.type}): ${entity.description}`)
      .join("\n");
    result += `\n\n---\n\n【相关角色/设定】\n${entitiesList}`;
  }

  return result;
}

/**
 * 格式化续写功能的 Payload
 */
function formatContinuePayload(payload: ContinuePayload): string {
  const parts: string[] = [];

  // 1. 父节点链（故事结构上下文）
  if (payload.ancestorChain && payload.ancestorChain.length > 0) {
    const chainInfo = payload.ancestorChain
      .map((node, index) => {
        const indent = "  ".repeat(index);
        const summary = node.summary ? `\n${indent}  摘要：${node.summary}` : "";
        return `${indent}📁 ${node.name}${summary}`;
      })
      .join("\n");
    parts.push(`【故事结构】\n${chainInfo}`);
  }

  // 2. 当前节点信息
  let nodeInfo = `【当前场景】\n**名称**：${payload.nodeName}`;
  if (payload.nodeSummary) {
    nodeInfo += `\n**摘要**：${payload.nodeSummary}`;
  }
  parts.push(nodeInfo);

  // 3. 关联实体
  if (payload.relatedEntities && payload.relatedEntities.length > 0) {
    const entitiesList = payload.relatedEntities
      .map((entity) => `- **${entity.name}** (${entity.type}): ${entity.description}`)
      .join("\n");
    parts.push(`【相关角色/设定】\n${entitiesList}`);
  }

  // 4. 光标前的内容（核心）
  parts.push(`【光标前的内容】\n${payload.contentBefore}`);

  // 5. 光标后的内容（如果有）
  if (payload.contentAfter && payload.contentAfter.trim()) {
    parts.push(`【光标后的内容（续写需要衔接到此处）】\n${payload.contentAfter}`);
  }

  // 6. 续写位置提示
  parts.push("请从【光标前的内容】末尾开始续写。");

  return parts.join("\n\n---\n\n");
}

/**
 * 格式化总结功能的 Payload
 */
function formatSummarizePayload(payload: SummarizePayload): string {
  const parts: string[] = [];

  // 1. 节点信息
  const typeLabel = payload.nodeType === "FILE" ? "场景" : "章节";
  parts.push(`【${typeLabel}名称】\n${payload.nodeName}`);

  // 2. 当前摘要（如果有）
  if (payload.currentSummary && payload.currentSummary.trim()) {
    parts.push(`【当前摘要】\n${payload.currentSummary}`);
  }

  // 3. 需要总结的内容
  if (payload.nodeType === "FILE") {
    parts.push(`【场景正文】\n${payload.content}`);
  } else {
    parts.push(`【子内容列表】\n${payload.content}`);
  }

  return parts.join("\n\n---\n\n");
}

/**
 * 构建特殊功能的用户消息
 * 将功能描述、上下文、用户额外指令整合到一条消息中
 */
export function buildSpecialRequestUserMessage(
  functionType: SpecialFunctionType,
  payload: unknown,
  userInstruction?: string,
  userContexts?: UserContextItem[]
): string {
  const parts: string[] = [];

  // 1. 任务描述
  parts.push(getTaskDescription(functionType));

  // 2. 用户上下文（如果有）
  if (userContexts && userContexts.length > 0) {
    // 对于修改功能，排除 selection 类型（因为选中文本已经在 payload 中）
    const filteredContexts =
      functionType === "polish" || functionType === "expand" || functionType === "compress"
        ? userContexts.filter((ctx) => ctx.type !== "selection")
        : userContexts;

    if (filteredContexts.length > 0) {
      const contextInfo = formatUserContexts(filteredContexts);
      parts.push(`【参考上下文】\n${contextInfo}`);
    }
  }

  // 3. 任务数据（根据功能类型格式化 payload）
  switch (functionType) {
    case "polish":
    case "expand":
    case "compress":
      parts.push(formatModifyPayload(payload as ModifyPayload));
      break;
    case "plan":
      parts.push(formatPlanPayload(payload as PlanPayload));
      break;
    case "continue":
      parts.push(formatContinuePayload(payload as ContinuePayload));
      break;
    case "summarize":
      parts.push(formatSummarizePayload(payload as SummarizePayload));
      break;
  }

  // 4. 用户额外指令（如果有）
  if (userInstruction && userInstruction.trim()) {
    parts.push(`【额外要求】\n${userInstruction}`);
  }

  // 5. 结束语
  parts.push("请根据以上信息，按指定格式输出结果。");

  return parts.join("\n\n---\n\n");
}

/**
 * 构建普通聊天的用户消息（带上下文）
 */
export function buildChatUserMessage(
  userMessage: string,
  userContexts?: UserContextItem[]
): string {
  if (!userContexts || userContexts.length === 0) {
    return userMessage;
  }

  const contextInfo = formatUserContexts(userContexts);
  return `【参考上下文】\n${contextInfo}\n\n---\n\n【我的问题】\n${userMessage}`;
}
