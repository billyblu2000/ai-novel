/**
 * 规划功能 Prompt 模板
 * 为文件夹节点生成子节点结构
 */

import type { ProjectInfo } from "@/lib/ai/types";

/**
 * 规划上下文
 */
export interface PlanContext {
  /** 当前节点名称 */
  nodeName: string;
  /** 当前节点大纲 */
  nodeOutline: string;
  /** 已有子节点列表 */
  existingChildren: Array<{
    title: string;
    summary: string;
    type: "FOLDER" | "FILE";
  }>;
  /** 父节点信息（上下文增强） */
  parentNode?: {
    name: string;
    outline: string;
  };
  /** 关联实体（上下文增强） */
  relatedEntities?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

/**
 * 规划结果中的单个子节点
 */
export interface PlannedChild {
  /** 子节点标题 */
  title: string;
  /** 子节点摘要/大纲 */
  summary: string;
  /** 子节点类型 */
  type: "FOLDER" | "FILE";
}

/**
 * 规划结果
 */
export interface PlanResult {
  /** 规划的子节点列表 */
  children: PlannedChild[];
  /** 规划说明 */
  explanation?: string;
}

/**
 * 获取规划功能的 System Prompt
 */
export function getPlanSystemPrompt(projectInfo?: ProjectInfo): string {
  let prompt = `你是一位专业的小说结构规划师，擅长根据大纲设计章节和场景结构。

## 任务
根据用户提供的章节/卷大纲，规划其子内容结构。

## 规则
1. **理解层级**：
   - 如果当前是"卷"级别，子内容应该是"章节"（FOLDER 类型）
   - 如果当前是"章节"级别，子内容应该是"场景"（FILE 类型）
   - 用户可能会在要求中指定子节点类型，请遵循用户指示

2. **保留已有内容**：
   - 如果已有子节点，不要重复规划相同内容
   - 新规划的内容应该与已有内容形成完整的故事结构
   - 可以在已有内容的基础上补充、扩展

3. **规划原则**：
   - 每个子节点需要有明确的标题和简短摘要
   - 摘要应该概括该部分的主要内容/事件
   - 保持故事的连贯性和节奏感
   - 标题要简洁有力，能体现内容核心

4. **输出格式**：
   必须输出 JSON 格式，结构如下：
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
   \`\`\`

## 注意
- 只输出 JSON，不要有其他内容
- 确保 JSON 格式正确，可以被解析
- type 只能是 "FOLDER" 或 "FILE"`;

  // 注入项目信息
  if (projectInfo) {
    prompt += `\n\n## 项目信息
- 项目名称：${projectInfo.title}`;
    if (projectInfo.description) {
      prompt += `\n- 项目简介：${projectInfo.description}`;
    }
  }

  return prompt;
}

/**
 * 构建规划功能的用户消息
 */
export function buildPlanUserMessage(
  context: PlanContext,
  userInstruction?: string
): string {
  let message = `## 当前节点
**名称**：${context.nodeName}

**大纲**：
${context.nodeOutline}`;

  // 已有子节点
  if (context.existingChildren.length > 0) {
    message += `\n\n## 已有子节点
${context.existingChildren
  .map(
    (child, index) =>
      `${index + 1}. **${child.title}** (${child.type === "FOLDER" ? "章节" : "场景"})
   摘要：${child.summary || "无"}`
  )
  .join("\n\n")}

请在已有子节点的基础上，规划还需要添加的子节点。`;
  }

  // 父节点信息（上下文增强）
  if (context.parentNode) {
    message += `\n\n## 上级节点信息
**名称**：${context.parentNode.name}
**大纲**：${context.parentNode.outline}`;
  }

  // 关联实体（上下文增强）
  if (context.relatedEntities && context.relatedEntities.length > 0) {
    message += `\n\n## 相关角色/设定
${context.relatedEntities
  .map((entity) => `- **${entity.name}** (${entity.type}): ${entity.description}`)
  .join("\n")}`;
  }

  // 用户额外指令
  if (userInstruction) {
    message += `\n\n## 用户要求
${userInstruction}`;
  }

  message += `\n\n请根据以上信息，输出规划结果（JSON 格式）。`;

  return message;
}

/**
 * 解析规划结果
 */
export function parsePlanResult(content: string): PlanResult | null {
  try {
    // 尝试提取 JSON 块
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

    // 解析 JSON
    const result = JSON.parse(jsonStr);

    // 验证结构
    if (!result.children || !Array.isArray(result.children)) {
      console.error("Invalid plan result: missing children array");
      return null;
    }

    // 验证每个子节点
    const validChildren: PlannedChild[] = [];
    for (const child of result.children) {
      if (
        typeof child.title === "string" &&
        typeof child.summary === "string" &&
        (child.type === "FOLDER" || child.type === "FILE")
      ) {
        validChildren.push({
          title: child.title,
          summary: child.summary,
          type: child.type,
        });
      }
    }

    if (validChildren.length === 0) {
      console.error("Invalid plan result: no valid children");
      return null;
    }

    return {
      children: validChildren,
      explanation: result.explanation,
    };
  } catch (error) {
    console.error("Failed to parse plan result:", error);
    return null;
  }
}
