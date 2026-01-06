import { NextRequest } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/ai/providers";
import {
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/api/response";

/**
 * 验证 API Key 请求 Schema
 */
const validateRequestSchema = z.object({
  providerId: z.string(),
  apiKey: z.string().min(1, "API Key 不能为空"),
  baseUrl: z.string().optional(),
});

/**
 * POST /api/ai/validate
 * 验证 AI Provider 的 API Key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = validateRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return validationErrorResponse(errorMessage);
    }

    const { providerId, apiKey, baseUrl } = parseResult.data;

    const provider = getProvider(providerId);
    if (!provider) {
      return validationErrorResponse(`不支持的 Provider: ${providerId}`);
    }

    const isValid = await provider.validateKey(apiKey, baseUrl);

    return Response.json({
      success: true,
      data: { valid: isValid },
    });
  } catch (error) {
    console.error("Validate API Key error:", error);
    const message = error instanceof Error ? error.message : "验证失败";
    return internalErrorResponse(message);
  }
}
