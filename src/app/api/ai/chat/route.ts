import { NextRequest } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/ai/providers";
import {
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import type { AIFunction, UserContextItem, ProjectInfo, SpecialFunctionType } from "@/lib/ai/types";
import type { ProviderMessage } from "@/lib/ai/types";
import {
  buildUnifiedSystemPrompt,
  buildSpecialRequestUserMessage,
  buildChatUserMessage,
} from "@/lib/ai/prompts";

/**
 * AI Chat 请求 Schema
 */
const chatRequestSchema = z.object({
  // 请求类型：chat（普通聊天）或 special（特殊功能）
  requestType: z.enum(["chat", "special"]),

  // 特殊功能类型（仅当 requestType 为 special 时需要）
  functionType: z
    .enum(["polish", "expand", "compress", "plan", "continue", "summarize"])
    .optional(),

  provider: z.object({
    id: z.string(),
    apiKey: z.string().min(1, "API Key 不能为空"),
    baseUrl: z.string().optional(),
    model: z.string(),
  }),

  // 历史消息（用于保持对话上下文）
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })
    )
    .default([]),

  // 当前用户输入
  userInput: z.string().optional(),

  // 特殊功能的 payload
  payload: z.unknown().optional(),

  // 用户上下文
  userContexts: z
    .array(
      z.union([
        z.object({
          type: z.literal("node"),
          nodeId: z.string(),
          title: z.string(),
          nodeType: z.enum(["FOLDER", "FILE"]),
          content: z.string(),
          summary: z.string(),
          timestamp: z.string().nullable().optional(),
          childrenNames: z.array(z.string()).optional(),
        }),
        z.object({
          type: z.literal("selection"),
          text: z.string(),
        }),
        z.object({
          type: z.literal("entity"),
          entityId: z.string(),
          entityType: z.enum(["CHARACTER", "LOCATION", "ITEM"]),
          name: z.string(),
          aliases: z.array(z.string()),
          description: z.string(),
          attributes: z.record(z.string(), z.unknown()),
        }),
      ])
    )
    .optional(),

  // 项目信息
  project: z
    .object({
      title: z.string(),
      description: z.string().nullable().optional(),
    })
    .optional(),

  // 其他选项
  jailbreak: z.boolean().optional(),
  stream: z.boolean().optional().default(true),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

export type ChatRequestBody = z.infer<typeof chatRequestSchema>;

/**
 * POST /api/ai/chat
 * 统一的 AI 聊天接口，支持流式和非流式响应
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证请求参数
    const parseResult = chatRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const zodError = parseResult.error;
      const errorMessage = zodError.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return validationErrorResponse(errorMessage);
    }

    const {
      requestType,
      functionType,
      provider: providerConfig,
      messages,
      userInput,
      payload,
      userContexts,
      project,
      stream = true,
      temperature,
      maxTokens,
    } = parseResult.data;

    // 获取 Provider
    const provider = getProvider(providerConfig.id);
    if (!provider) {
      return validationErrorResponse(`不支持的 Provider: ${providerConfig.id}`);
    }

    // 构建配置
    const config = {
      id: providerConfig.id,
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      model: providerConfig.model,
    };

    // 构建统一的 System Prompt
    const systemPrompt = buildUnifiedSystemPrompt(project as ProjectInfo | undefined);

    // 构建最终消息列表
    let finalMessages: ProviderMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    // 添加历史消息（排除旧的 system 消息）
    const historyMessages = messages.filter((m) => m.role !== "system");
    finalMessages.push(...historyMessages);

    // 根据请求类型构建当前用户消息
    if (requestType === "special") {
      // 特殊功能请求
      if (!functionType) {
        return validationErrorResponse("特殊功能请求需要提供 functionType");
      }

      // 构建特殊功能的用户消息
      const specialUserMessage = buildSpecialRequestUserMessage(
        functionType as SpecialFunctionType,
        payload,
        userInput,
        userContexts as UserContextItem[] | undefined
      );

      finalMessages.push({ role: "user", content: specialUserMessage });
    } else {
      // 普通聊天请求
      if (!userInput) {
        return validationErrorResponse("聊天请求需要提供 userInput");
      }

      // 构建普通聊天的用户消息（可能带上下文）
      const chatUserMessage = buildChatUserMessage(
        userInput,
        userContexts as UserContextItem[] | undefined
      );

      finalMessages.push({ role: "user", content: chatUserMessage });
    }

    // 确定实际的 AI 功能（用于 debug 信息）
    const aiFunction: AIFunction =
      requestType === "special" && functionType ? functionType : "chat";

    const params = {
      messages: finalMessages,
      model: providerConfig.model,
      temperature,
      maxTokens,
    };

    // 流式响应
    if (stream) {
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // 首先发送 debug 信息（包含实际发送给模型的完整消息）
            const debugData = JSON.stringify({
              debug: {
                timestamp: Date.now(),
                function: aiFunction,
                requestType,
                messages: finalMessages,
                userContexts,
                provider: providerConfig.id,
                model: providerConfig.model,
              },
            });
            controller.enqueue(encoder.encode(`data: ${debugData}\n\n`));

            const generator = provider.chat(config, params);

            for await (const chunk of generator) {
              // 发送 SSE 格式的数据
              const data = JSON.stringify({ content: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // 发送完成信号
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            // 发送错误信息
            const errorMessage =
              error instanceof Error ? error.message : "未知错误";
            const errorData = JSON.stringify({ error: errorMessage });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // 非流式响应
    const response = await provider.chatSync(config, params);

    return Response.json({
      success: true,
      data: {
        content: response.content,
        finishReason: response.finishReason,
        usage: response.usage,
      },
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    const message = error instanceof Error ? error.message : "AI 请求失败";
    return internalErrorResponse(message);
  }
}

/**
 * GET /api/ai/chat
 * 返回支持的 Provider 信息
 */
export async function GET() {
  const { getAllProviderInfo, getRecommendedModels } = await import(
    "@/lib/ai/providers"
  );

  const providers = getAllProviderInfo().map((p) => ({
    ...p,
    models: getRecommendedModels(p.id),
  }));

  return Response.json({
    success: true,
    data: {
      providers,
      functions: [
        { id: "polish", name: "润色", description: "提升文学性和可读性" },
        { id: "expand", name: "扩写", description: "丰富细节和描写" },
        { id: "compress", name: "缩写", description: "精简内容，保留核心" },
        { id: "continue", name: "续写", description: "接续当前内容继续创作" },
        { id: "plan", name: "规划", description: "根据大纲生成场景摘要" },
        { id: "summarize", name: "总结", description: "根据内容生成摘要" },
        { id: "chat", name: "聊天", description: "自由对话" },
      ] satisfies Array<{ id: AIFunction; name: string; description: string }>,
    },
  });
}
