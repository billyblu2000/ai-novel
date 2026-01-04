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
   * SiliconFlow 有很多模型，这里列出一些常用的
   */
  static RECOMMENDED_MODELS: AIModel[] = [
    {
      id: "Qwen/Qwen2.5-7B-Instruct",
      name: "Qwen2.5 7B",
      description: "通义千问 2.5 7B，平衡性能与速度",
      contextLength: 32768,
    },
    {
      id: "Qwen/Qwen2.5-14B-Instruct",
      name: "Qwen2.5 14B",
      description: "通义千问 2.5 14B，更强的推理能力",
      contextLength: 32768,
    },
    {
      id: "Qwen/Qwen2.5-32B-Instruct",
      name: "Qwen2.5 32B",
      description: "通义千问 2.5 32B，高质量输出",
      contextLength: 32768,
    },
    {
      id: "Qwen/Qwen2.5-72B-Instruct",
      name: "Qwen2.5 72B",
      description: "通义千问 2.5 72B，最强性能",
      contextLength: 32768,
    },
    {
      id: "deepseek-ai/DeepSeek-V2.5",
      name: "DeepSeek V2.5",
      description: "DeepSeek V2.5，优秀的中文能力",
      contextLength: 65536,
    },
    {
      id: "deepseek-ai/DeepSeek-V3",
      name: "DeepSeek V3",
      description: "DeepSeek V3，最新版本",
      contextLength: 65536,
    },
    {
      id: "meta-llama/Meta-Llama-3.1-8B-Instruct",
      name: "Llama 3.1 8B",
      description: "Meta Llama 3.1 8B",
      contextLength: 8192,
    },
    {
      id: "meta-llama/Meta-Llama-3.1-70B-Instruct",
      name: "Llama 3.1 70B",
      description: "Meta Llama 3.1 70B",
      contextLength: 8192,
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
    return "Qwen/Qwen2.5-7B-Instruct";
  }
}
