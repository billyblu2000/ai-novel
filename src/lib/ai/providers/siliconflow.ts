import { OpenAICompatibleProvider } from "./base";
import type { AIModel } from "../types";

/**
 * SiliconFlow Provider
 * 
 * SiliconFlow 部署了大量开源模型，使用 OpenAI 兼容 API
 * https://docs.siliconflow.cn/
 */
export class SiliconFlowProvider extends OpenAICompatibleProvider {
  id = "siliconflow";
  name = "SiliconFlow";
  defaultBaseUrl = "https://api.siliconflow.cn/v1";

  /**
   * 推荐的模型列表
   */
  static RECOMMENDED_MODELS: AIModel[] = [
    {
      id: "Pro/deepseek-ai/DeepSeek-V3.2",
      name: "DeepSeek V3.2",
      description: "DeepSeek V3.2 版本，高质量输出",
      contextLength: 65536,
    },
  ];

  /**
   * 获取模型列表
   * 优先返回推荐模型，如果 API 调用成功则合并
   */
  async listModels(apiKey: string, baseUrl?: string): Promise<AIModel[]> {
    try {
      const apiModels = await super.listModels(apiKey, baseUrl);
      
      // 如果 API 返回了模型，将推荐模型放在前面
      if (apiModels.length > 0) {
        const recommendedIds = new Set(
          SiliconFlowProvider.RECOMMENDED_MODELS.map((m) => m.id)
        );
        const otherModels = apiModels.filter((m) => !recommendedIds.has(m.id));
        return [...SiliconFlowProvider.RECOMMENDED_MODELS, ...otherModels];
      }
    } catch {
      // API 调用失败，返回推荐模型
    }

    return SiliconFlowProvider.RECOMMENDED_MODELS;
  }

  /**
   * 获取默认模型
   */
  static getDefaultModel(): string {
    return "Pro/deepseek-ai/DeepSeek-V3.2";
  }
}
