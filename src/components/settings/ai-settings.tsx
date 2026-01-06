"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useAIStore, initializeAIStore } from "@/lib/stores/ai-store";
import {
  getAllProviderInfo,
  getRecommendedModels,
} from "@/lib/ai/providers/client";
import { updateGeminiSettings } from "@/lib/ai/settings";
import type { AIFunction, AIModel, FunctionModelConfig } from "@/lib/ai/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// AI 功能列表
const AI_FUNCTIONS: { id: AIFunction; name: string; description: string }[] = [
  { id: "polish", name: "润色", description: "提升文学性和可读性" },
  { id: "expand", name: "扩写", description: "丰富细节，增加描写" },
  { id: "compress", name: "缩写", description: "精简内容，保留核心" },
  { id: "continue", name: "续写", description: "接续当前内容继续创作" },
  { id: "plan", name: "规划", description: "生成场景摘要/大纲" },
  { id: "summarize", name: "总结", description: "根据内容生成摘要" },
  { id: "chat", name: "聊天", description: "自由对话" },
];

export function AISettings() {
  const {
    settings,
    settingsLoaded,
    updateProviderSettings,
    updateFunctionModel,
  } = useAIStore();

  // 初始化设置
  useEffect(() => {
    if (!settingsLoaded) {
      initializeAIStore();
    }
  }, [settingsLoaded]);

  // Provider 配置状态
  const [providerConfigs, setProviderConfigs] = useState<
    Record<string, { apiKey: string; baseUrl: string; enabled: boolean }>
  >({});

  // Gemini 双 Key 配置状态
  const [geminiKeys, setGeminiKeys] = useState<{
    freeApiKey: string;
    paidApiKey: string;
  }>({ freeApiKey: "", paidApiKey: "" });

  // 连接测试状态
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, boolean | null>
  >({});

  // API Key 显示状态
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  // 功能模型配置状态
  const [functionConfigs, setFunctionConfigs] = useState<
    Record<AIFunction, FunctionModelConfig | "auto">
  >({} as Record<AIFunction, FunctionModelConfig | "auto">);

  // 从 settings 初始化本地状态
  useEffect(() => {
    if (settingsLoaded) {
      // 初始化 Provider 配置
      const providers = getAllProviderInfo();
      const configs: Record<
        string,
        { apiKey: string; baseUrl: string; enabled: boolean }
      > = {};

      for (const provider of providers) {
        const savedConfig = settings.providers[provider.id];
        configs[provider.id] = {
          apiKey: savedConfig?.apiKey || "",
          baseUrl: savedConfig?.baseUrl || provider.defaultBaseUrl,
          enabled: savedConfig?.enabled || false,
        };
      }
      setProviderConfigs(configs);

      // 初始化 Gemini 双 Key 配置
      if (settings.geminiSettings) {
        setGeminiKeys({
          freeApiKey: settings.geminiSettings.freeApiKey || "",
          paidApiKey: settings.geminiSettings.paidApiKey || "",
        });
      }

      // 初始化功能模型配置
      setFunctionConfigs({ ...settings.functionModels });
    }
  }, [settingsLoaded, settings]);

  // 测试连接
  const testConnection = useCallback(
    async (providerId: string, keyType?: "free" | "paid") => {
      const config = providerConfigs[providerId];
      
      // Gemini 特殊处理
      let apiKeyToTest = config?.apiKey;
      if (providerId === "gemini" && keyType) {
        apiKeyToTest = keyType === "free" ? geminiKeys.freeApiKey : geminiKeys.paidApiKey;
      }
      
      if (!apiKeyToTest) {
        toast.error("请先输入 API Key");
        return;
      }

      const testKey = keyType ? `${providerId}-${keyType}` : providerId;
      setTestingProvider(testKey);
      setTestResults((prev) => ({ ...prev, [testKey]: null }));

      try {
        // 通过 API 验证，避免在客户端使用 Node.js 模块
        const response = await fetch("/api/ai/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId,
            apiKey: apiKeyToTest,
            baseUrl: config?.baseUrl,
          }),
        });

        const result = await response.json();
        const isValid = result.success && result.data?.valid;

        setTestResults((prev) => ({ ...prev, [testKey]: isValid }));

        if (isValid) {
          toast.success("连接成功！");
        } else {
          toast.error("API Key 无效");
        }
      } catch (error) {
        console.error("Test connection error:", error);
        setTestResults((prev) => ({ ...prev, [testKey]: false }));
        toast.error("连接失败，请检查网络或 API Key");
      } finally {
        setTestingProvider(null);
      }
    },
    [providerConfigs, geminiKeys]
  );

  // 保存 Provider 配置
  const saveProviderConfig = useCallback(
    (providerId: string) => {
      const config = providerConfigs[providerId];
      if (config) {
        // Gemini 使用特殊的保存逻辑
        if (providerId === "gemini") {
          updateGeminiSettings(
            geminiKeys.freeApiKey,
            geminiKeys.paidApiKey,
            config.enabled,
            config.baseUrl
          );
          // 同步更新 store
          const primaryKey = geminiKeys.paidApiKey || geminiKeys.freeApiKey;
          updateProviderSettings(providerId, primaryKey, config.enabled, config.baseUrl);
        } else {
          updateProviderSettings(
            providerId,
            config.apiKey,
            config.enabled,
            config.baseUrl
          );
        }
        toast.success("已保存");
      }
    },
    [providerConfigs, geminiKeys, updateProviderSettings]
  );

  // 保存 Gemini 双 Key 配置
  const saveGeminiKeys = useCallback(() => {
    const config = providerConfigs["gemini"];
    if (config) {
      updateGeminiSettings(
        geminiKeys.freeApiKey,
        geminiKeys.paidApiKey,
        config.enabled,
        config.baseUrl
      );
      // 同步更新 store
      const primaryKey = geminiKeys.paidApiKey || geminiKeys.freeApiKey;
      updateProviderSettings("gemini", primaryKey, config.enabled, config.baseUrl);
      toast.success("已保存");
    }
  }, [providerConfigs, geminiKeys, updateProviderSettings]);

  // 保存功能模型配置
  const saveFunctionConfig = useCallback(
    (func: AIFunction, config: FunctionModelConfig | "auto") => {
      updateFunctionModel(func, config);
      setFunctionConfigs((prev) => ({ ...prev, [func]: config }));
    },
    [updateFunctionModel]
  );

  // 获取可用的 Provider 列表（用于功能模型选择）
  const enabledProviders = Object.entries(providerConfigs)
    .filter(([id, config]) => {
      if (!config.enabled) return false;
      // Gemini 特殊处理：有任一 Key 即可
      if (id === "gemini") {
        return geminiKeys.freeApiKey || geminiKeys.paidApiKey;
      }
      return config.apiKey;
    })
    .map(([id]) => {
      const info = getAllProviderInfo().find((p) => p.id === id);
      return { id, name: info?.name || id };
    });

  // 获取指定 Provider 的模型列表
  const getModelsForProvider = (providerId: string): AIModel[] => {
    const models = getRecommendedModels(providerId);
    
    // Gemini 特殊处理：根据可用的 Key 过滤模型
    if (providerId === "gemini") {
      return models.filter((model) => {
        // 仅 gemini-3-pro-preview 需要付费 Key
        const isPaidOnly = model.id === "gemini-3-pro-preview";
        if (isPaidOnly) {
          return !!geminiKeys.paidApiKey;
        }
        // 其他模型有任一 Key 即可
        return geminiKeys.freeApiKey || geminiKeys.paidApiKey;
      });
    }
    
    return models;
  };

  const providers = getAllProviderInfo();

  if (!settingsLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* AI 服务商配置 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">AI 服务商</h3>
        <p className="text-sm text-muted-foreground mb-4">
          配置 API Key 以启用 AI 功能。API Key 仅存储在本地浏览器中。
        </p>

        <div className="space-y-4">
          {providers.map((provider) => {
            const config = providerConfigs[provider.id] || {
              apiKey: "",
              baseUrl: provider.defaultBaseUrl,
              enabled: false,
            };
            const isGemini = provider.id === "gemini";
            const testResult = testResults[provider.id];
            const isTesting = testingProvider === provider.id;
            const isShowingKey = showApiKey[provider.id];

            // Gemini 特殊渲染
            if (isGemini) {
              const freeTestResult = testResults["gemini-free"];
              const paidTestResult = testResults["gemini-paid"];
              const isTestingFree = testingProvider === "gemini-free";
              const isTestingPaid = testingProvider === "gemini-paid";
              const isShowingFreeKey = showApiKey["gemini-free"];
              const isShowingPaidKey = showApiKey["gemini-paid"];

              return (
                <div
                  key={provider.id}
                  className="border rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`enable-${provider.id}`}
                        checked={config.enabled}
                        onChange={(e) => {
                          const newConfig = {
                            ...config,
                            enabled: e.target.checked,
                          };
                          setProviderConfigs((prev) => ({
                            ...prev,
                            [provider.id]: newConfig,
                          }));
                          // 使用 Gemini 特殊保存
                          updateGeminiSettings(
                            geminiKeys.freeApiKey,
                            geminiKeys.paidApiKey,
                            newConfig.enabled,
                            newConfig.baseUrl
                          );
                          const primaryKey = geminiKeys.paidApiKey || geminiKeys.freeApiKey;
                          updateProviderSettings(provider.id, primaryKey, newConfig.enabled, newConfig.baseUrl);
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label
                        htmlFor={`enable-${provider.id}`}
                        className="font-medium text-base"
                      >
                        {provider.name}
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Gemini 支持免费和付费两种 API Key：</p>
                            <ul className="list-disc list-inside mt-1 text-xs">
                              <li>免费 Key：仅支持 Flash 模型</li>
                              <li>付费 Key：支持所有模型</li>
                              <li>Flash 模型优先使用免费 Key</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* 免费 API Key */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="gemini-free-key">免费 API Key</Label>
                      <span className="text-xs text-muted-foreground">(Flash 模型)</span>
                      {freeTestResult !== undefined && freeTestResult !== null && (
                        <span className="flex items-center gap-1 text-xs">
                          {freeTestResult ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="gemini-free-key"
                          type={isShowingFreeKey ? "text" : "password"}
                          value={geminiKeys.freeApiKey}
                          onChange={(e) => {
                            setGeminiKeys((prev) => ({
                              ...prev,
                              freeApiKey: e.target.value,
                            }));
                            setTestResults((prev) => ({
                              ...prev,
                              "gemini-free": null,
                            }));
                          }}
                          onBlur={saveGeminiKeys}
                          placeholder="输入免费 API Key（可选）"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => {
                            setShowApiKey((prev) => ({
                              ...prev,
                              "gemini-free": !prev["gemini-free"],
                            }));
                          }}
                        >
                          {isShowingFreeKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection("gemini", "free")}
                        disabled={isTestingFree || !geminiKeys.freeApiKey}
                      >
                        {isTestingFree ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "测试"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 付费 API Key */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="gemini-paid-key">付费 API Key</Label>
                      <span className="text-xs text-muted-foreground">(所有模型)</span>
                      {paidTestResult !== undefined && paidTestResult !== null && (
                        <span className="flex items-center gap-1 text-xs">
                          {paidTestResult ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="gemini-paid-key"
                          type={isShowingPaidKey ? "text" : "password"}
                          value={geminiKeys.paidApiKey}
                          onChange={(e) => {
                            setGeminiKeys((prev) => ({
                              ...prev,
                              paidApiKey: e.target.value,
                            }));
                            setTestResults((prev) => ({
                              ...prev,
                              "gemini-paid": null,
                            }));
                          }}
                          onBlur={saveGeminiKeys}
                          placeholder="输入付费 API Key（可选）"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => {
                            setShowApiKey((prev) => ({
                              ...prev,
                              "gemini-paid": !prev["gemini-paid"],
                            }));
                          }}
                        >
                          {isShowingPaidKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection("gemini", "paid")}
                        disabled={isTestingPaid || !geminiKeys.paidApiKey}
                      >
                        {isTestingPaid ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "测试"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Base URL */}
                  <div className="space-y-2">
                    <Label htmlFor={`baseurl-${provider.id}`}>Base URL</Label>
                    <Input
                      id={`baseurl-${provider.id}`}
                      value={config.baseUrl}
                      onChange={(e) => {
                        setProviderConfigs((prev) => ({
                          ...prev,
                          [provider.id]: {
                            ...prev[provider.id],
                            baseUrl: e.target.value,
                          },
                        }));
                      }}
                      onBlur={saveGeminiKeys}
                      placeholder={provider.defaultBaseUrl}
                    />
                  </div>

                  {/* 可用模型提示 */}
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    {!geminiKeys.freeApiKey && !geminiKeys.paidApiKey ? (
                      <span>请至少配置一个 API Key</span>
                    ) : (
                      <span>
                        可用模型：
                        {(geminiKeys.freeApiKey || geminiKeys.paidApiKey) && " 2.5 Pro, Flash"}
                        {geminiKeys.paidApiKey && ", 3 Pro"}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            // 其他 Provider 正常渲染
            return (
              <div
                key={provider.id}
                className="border rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`enable-${provider.id}`}
                      checked={config.enabled}
                      onChange={(e) => {
                        const newConfig = {
                          ...config,
                          enabled: e.target.checked,
                        };
                        setProviderConfigs((prev) => ({
                          ...prev,
                          [provider.id]: newConfig,
                        }));
                        updateProviderSettings(
                          provider.id,
                          newConfig.apiKey,
                          newConfig.enabled,
                          newConfig.baseUrl
                        );
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label
                      htmlFor={`enable-${provider.id}`}
                      className="font-medium text-base"
                    >
                      {provider.name}
                    </Label>
                  </div>
                  {testResult !== undefined && testResult !== null && (
                    <div className="flex items-center gap-1 text-sm">
                      {testResult ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-green-500">已连接</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-500">连接失败</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`apikey-${provider.id}`}>API Key</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id={`apikey-${provider.id}`}
                          type={isShowingKey ? "text" : "password"}
                          value={config.apiKey}
                          onChange={(e) => {
                            setProviderConfigs((prev) => ({
                              ...prev,
                              [provider.id]: {
                                ...prev[provider.id],
                                apiKey: e.target.value,
                              },
                            }));
                            setTestResults((prev) => ({
                              ...prev,
                              [provider.id]: null,
                            }));
                          }}
                          onBlur={() => saveProviderConfig(provider.id)}
                          placeholder="输入 API Key"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => {
                            setShowApiKey((prev) => ({
                              ...prev,
                              [provider.id]: !prev[provider.id],
                            }));
                          }}
                        >
                          {isShowingKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection(provider.id)}
                        disabled={isTesting || !config.apiKey}
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "测试"
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`baseurl-${provider.id}`}>Base URL</Label>
                    <Input
                      id={`baseurl-${provider.id}`}
                      value={config.baseUrl}
                      onChange={(e) => {
                        setProviderConfigs((prev) => ({
                          ...prev,
                          [provider.id]: {
                            ...prev[provider.id],
                            baseUrl: e.target.value,
                          },
                        }));
                      }}
                      onBlur={() => saveProviderConfig(provider.id)}
                      placeholder={provider.defaultBaseUrl}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* 功能模型配置 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">功能模型配置</h3>
        <p className="text-sm text-muted-foreground mb-4">
          为每个 AI 功能选择使用的模型。选择"自动"将使用第一个可用的服务商。
        </p>

        {enabledProviders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            请先在上方启用至少一个 AI 服务商
          </div>
        ) : (
          <div className="space-y-3">
            {AI_FUNCTIONS.map((func) => {
              const config = functionConfigs[func.id];
              const isAuto = config === "auto";
              const selectedProvider = isAuto
                ? ""
                : (config as FunctionModelConfig)?.provider || "";
              const selectedModel = isAuto
                ? ""
                : (config as FunctionModelConfig)?.model || "";

              return (
                <div
                  key={func.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2"
                >
                  <div className="sm:w-24 flex-shrink-0">
                    <span className="font-medium">{func.name}</span>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      {func.description}
                    </p>
                  </div>
                  <Select
                    value={
                      isAuto ? "auto" : `${selectedProvider}:${selectedModel}`
                    }
                    onValueChange={(value) => {
                      if (value === "auto") {
                        saveFunctionConfig(func.id, "auto");
                      } else {
                        const [provider, model] = value.split(":");
                        saveFunctionConfig(func.id, { provider, model });
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">自动选择</SelectItem>
                      {enabledProviders.map((provider) => {
                        const models = getModelsForProvider(provider.id);
                        return models.map((model) => (
                          <SelectItem
                            key={`${provider.id}:${model.id}`}
                            value={`${provider.id}:${model.id}`}
                          >
                            {provider.name} / {model.name}
                          </SelectItem>
                        ));
                      })}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
