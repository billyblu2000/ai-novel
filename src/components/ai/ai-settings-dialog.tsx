"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useAIStore, initializeAIStore } from "@/lib/stores/ai-store";
import {
  getAllProviderInfo,
  getProvider,
  getRecommendedModels,
} from "@/lib/ai/providers";
import type { AIFunction, AIModel, FunctionModelConfig } from "@/lib/ai/types";

interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

// 默认 Prompt 模板
const DEFAULT_PROMPTS: Record<AIFunction, string> = {
  polish: `请润色以下文字，提升文学性和可读性。

## 要求
- 保持原意不变
- 优化句式结构
- 增强表达力度
- 修正语法错误
- 不要大幅增加或删减内容

请直接输出润色后的文字，不要添加解释。`,
  expand: `请扩写以下文字，丰富细节和描写。

## 要求
- 扩展到原文的 2-3 倍长度
- 增加环境描写、心理活动或感官细节
- 保持与上下文的连贯性
- 符合当前场景的氛围

请直接输出扩写后的文字。`,
  compress: `请精简以下文字，保留核心信息。

## 要求
- 压缩到原文的 1/2 左右
- 保留关键情节和信息
- 删除冗余描写
- 保持语句流畅

请直接输出精简后的文字。`,
  continue: `请续写以下内容。

## 要求
- 自然衔接上文
- 保持风格一致
- 推进情节发展
- 约 300-500 字

请直接输出续写内容。`,
  plan: `请根据父章节的规划，为当前场景生成摘要。

## 要求
- 50-100 字
- 概括这个场景应该发生什么
- 与父章节规划保持一致
- 为后续写作提供方向

请直接输出场景摘要。`,
  summarize: `请为以下内容生成摘要。

## 要求
- 50-100 字
- 概括核心事件
- 提及主要角色
- 不剧透结局细节

请直接输出摘要。`,
  chat: `你是一位专业的小说写作助手，擅长中文长篇小说创作。请根据用户的问题提供帮助。`,
};

export function AISettingsDialog({ open, onOpenChange }: AISettingsDialogProps) {
  const { settings, settingsLoaded, updateProviderSettings, updateFunctionModel, updateCustomPrompt } =
    useAIStore();

  // 初始化设置
  useEffect(() => {
    if (open && !settingsLoaded) {
      initializeAIStore();
    }
  }, [open, settingsLoaded]);

  // Provider 配置状态
  const [providerConfigs, setProviderConfigs] = useState<
    Record<string, { apiKey: string; baseUrl: string; enabled: boolean }>
  >({});

  // 连接测试状态
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});

  // API Key 显示状态
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  // 功能模型配置状态
  const [functionConfigs, setFunctionConfigs] = useState<
    Record<AIFunction, FunctionModelConfig | "auto">
  >({} as Record<AIFunction, FunctionModelConfig | "auto">);

  // 自定义 Prompt 状态
  const [customPrompts, setCustomPrompts] = useState<Record<AIFunction, string>>({} as Record<AIFunction, string>);
  const [selectedPromptFunction, setSelectedPromptFunction] = useState<AIFunction>("polish");

  // 从 settings 初始化本地状态
  useEffect(() => {
    if (settingsLoaded && open) {
      // 初始化 Provider 配置
      const providers = getAllProviderInfo();
      const configs: Record<string, { apiKey: string; baseUrl: string; enabled: boolean }> = {};
      
      for (const provider of providers) {
        const savedConfig = settings.providers[provider.id];
        configs[provider.id] = {
          apiKey: savedConfig?.apiKey || "",
          baseUrl: savedConfig?.baseUrl || provider.defaultBaseUrl,
          enabled: savedConfig?.enabled || false,
        };
      }
      setProviderConfigs(configs);

      // 初始化功能模型配置
      setFunctionConfigs({ ...settings.functionModels });

      // 初始化自定义 Prompt
      const prompts: Record<AIFunction, string> = {} as Record<AIFunction, string>;
      for (const func of AI_FUNCTIONS) {
        prompts[func.id] = settings.customPrompts[func.id] || DEFAULT_PROMPTS[func.id];
      }
      setCustomPrompts(prompts);
    }
  }, [settingsLoaded, open, settings]);

  // 测试连接
  const testConnection = useCallback(async (providerId: string) => {
    const config = providerConfigs[providerId];
    if (!config?.apiKey) {
      toast.error("请先输入 API Key");
      return;
    }

    setTestingProvider(providerId);
    setTestResults((prev) => ({ ...prev, [providerId]: null }));

    try {
      const provider = getProvider(providerId);
      if (!provider) {
        throw new Error("Provider not found");
      }

      const isValid = await provider.validateKey(config.apiKey, config.baseUrl);
      setTestResults((prev) => ({ ...prev, [providerId]: isValid }));

      if (isValid) {
        toast.success("连接成功！");
      } else {
        toast.error("API Key 无效");
      }
    } catch (error) {
      console.error("Test connection error:", error);
      setTestResults((prev) => ({ ...prev, [providerId]: false }));
      toast.error("连接失败，请检查网络或 API Key");
    } finally {
      setTestingProvider(null);
    }
  }, [providerConfigs]);

  // 保存设置
  const handleSave = useCallback(() => {
    // 保存 Provider 配置
    for (const [providerId, config] of Object.entries(providerConfigs)) {
      updateProviderSettings(
        providerId,
        config.apiKey,
        config.enabled,
        config.baseUrl
      );
    }

    // 保存功能模型配置
    for (const [func, config] of Object.entries(functionConfigs)) {
      updateFunctionModel(func as AIFunction, config);
    }

    // 保存自定义 Prompt
    for (const [func, prompt] of Object.entries(customPrompts)) {
      const isDefault = prompt === DEFAULT_PROMPTS[func as AIFunction];
      updateCustomPrompt(func as AIFunction, isDefault ? null : prompt);
    }

    toast.success("设置已保存");
    onOpenChange(false);
  }, [providerConfigs, functionConfigs, customPrompts, updateProviderSettings, updateFunctionModel, updateCustomPrompt, onOpenChange]);

  // 获取可用的 Provider 列表（用于功能模型选择）
  const enabledProviders = Object.entries(providerConfigs)
    .filter(([, config]) => config.enabled && config.apiKey)
    .map(([id]) => {
      const info = getAllProviderInfo().find((p) => p.id === id);
      return { id, name: info?.name || id };
    });

  // 获取指定 Provider 的模型列表
  const getModelsForProvider = (providerId: string): AIModel[] => {
    return getRecommendedModels(providerId);
  };

  const providers = getAllProviderInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI 设置</DialogTitle>
          <DialogDescription>
            配置 API 服务商和模型偏好
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="providers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="providers">服务商</TabsTrigger>
            <TabsTrigger value="models">功能模型</TabsTrigger>
            <TabsTrigger value="prompts">自定义 Prompt</TabsTrigger>
          </TabsList>

          {/* 服务商配置 */}
          <TabsContent value="providers" className="space-y-4 mt-4">
            {providers.map((provider) => {
              const config = providerConfigs[provider.id] || {
                apiKey: "",
                baseUrl: provider.defaultBaseUrl,
                enabled: false,
              };
              const testResult = testResults[provider.id];
              const isTesting = testingProvider === provider.id;
              const isShowingKey = showApiKey[provider.id];

              return (
                <div
                  key={provider.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`enable-${provider.id}`}
                        checked={config.enabled}
                        onChange={(e) => {
                          setProviderConfigs((prev) => ({
                            ...prev,
                            [provider.id]: {
                              ...prev[provider.id],
                              enabled: e.target.checked,
                            },
                          }));
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label
                        htmlFor={`enable-${provider.id}`}
                        className="font-medium"
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
                            // 清除测试结果
                            setTestResults((prev) => ({
                              ...prev,
                              [provider.id]: null,
                            }));
                          }}
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
                      placeholder={provider.defaultBaseUrl}
                    />
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* 功能模型配置 */}
          <TabsContent value="models" className="space-y-4 mt-4">
            {enabledProviders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                请先在「服务商」标签页中启用至少一个 API 服务商
              </div>
            ) : (
              <div className="space-y-3">
                {AI_FUNCTIONS.map((func) => {
                  const config = functionConfigs[func.id];
                  const isAuto = config === "auto";
                  const selectedProvider = isAuto ? "" : (config as FunctionModelConfig)?.provider || "";
                  const selectedModel = isAuto ? "" : (config as FunctionModelConfig)?.model || "";

                  return (
                    <div
                      key={func.id}
                      className="flex items-center gap-4 py-2"
                    >
                      <div className="w-20 flex-shrink-0">
                        <span className="font-medium">{func.name}</span>
                      </div>
                      <Select
                        value={isAuto ? "auto" : `${selectedProvider}:${selectedModel}`}
                        onValueChange={(value) => {
                          if (value === "auto") {
                            setFunctionConfigs((prev) => ({
                              ...prev,
                              [func.id]: "auto",
                            }));
                          } else {
                            const [provider, model] = value.split(":");
                            setFunctionConfigs((prev) => ({
                              ...prev,
                              [func.id]: { provider, model },
                            }));
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
          </TabsContent>

          {/* 自定义 Prompt */}
          <TabsContent value="prompts" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2">
              {AI_FUNCTIONS.map((func) => (
                <Button
                  key={func.id}
                  variant={selectedPromptFunction === func.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPromptFunction(func.id)}
                >
                  {func.name}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {AI_FUNCTIONS.find((f) => f.id === selectedPromptFunction)?.name} Prompt
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomPrompts((prev) => ({
                      ...prev,
                      [selectedPromptFunction]: DEFAULT_PROMPTS[selectedPromptFunction],
                    }));
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  恢复默认
                </Button>
              </div>
              <Textarea
                value={customPrompts[selectedPromptFunction] || ""}
                onChange={(e) => {
                  setCustomPrompts((prev) => ({
                    ...prev,
                    [selectedPromptFunction]: e.target.value,
                  }));
                }}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                可用变量: {"{{selected_text}}"}, {"{{context}}"}, {"{{scene_title}}"}, {"{{scene_summary}}"}, {"{{current_content}}"}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存设置</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
