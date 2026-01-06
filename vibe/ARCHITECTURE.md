# AI Novel Studio - 技术架构文档

> 本文档描述 AI 功能模块的技术架构，帮助开发者快速理解代码组织和数据流。

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              用户界面层                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ai-chat-window.tsx    │  ai-context-menu.tsx  │  folder-editor.tsx     │
│  (AI 聊天浮窗)         │  (右键菜单)           │  (规划按钮)            │
├─────────────────────────────────────────────────────────────────────────┤
│                              组件层                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ai-chat-input.tsx     │  ai-chat-messages.tsx │  message-renderer.tsx  │
│  ai-context-tags.tsx   │  ai-modify-result-card│  ai-plan-result-card   │
│  ai-special-request-card                       │  ai-context-selector   │
├─────────────────────────────────────────────────────────────────────────┤
│                              状态管理层                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                         ai-store.ts (Zustand)                           │
│  - chatHistory: ChatMessage[]                                           │
│  - pendingContexts: UserContextItem[]                                   │
│  - pendingSpecialFunction: PendingSpecialFunction | null                │
│  - isLoading, isStreaming, error...                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                              Hook 层                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                      use-ai-request.ts                                  │
│  - sendRequest(params) → 发送 AI 请求                                   │
│  - stopRequest() → 取消请求                                             │
│  - markAsApplied(id) → 标记结果已应用                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                              API 层                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                    POST /api/ai/chat                                    │
│  - 验证请求参数 (Zod)                                                   │
│  - 构建 System Prompt + User Message                                    │
│  - 调用 Provider 并返回 SSE 流                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                           Provider 层                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  OpenAICompatibleProvider (base.ts)                                     │
│  ├── SiliconFlowProvider                                                │
│  └── GeminiProvider                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心概念

### 2.1 统一消息流架构

所有 AI 交互都通过消息来表示，存储在 `chatHistory` 中：

```typescript
type ChatMessage = TextMessage | SpecialRequestMessage | SpecialResultMessage;
```

| 消息类型 | 说明 | 示例 |
|----------|------|------|
| `TextMessage` | 普通文本消息 | 用户提问、AI 回复 |
| `SpecialRequestMessage` | 特殊功能请求 | 润色、扩写、规划等 |
| `SpecialResultMessage` | 特殊功能结果 | 修改后的文本、规划的子节点 |

### 2.2 功能分类

```typescript
type AIFunction = "chat" | "polish" | "expand" | "compress" | "plan" | "continue" | "summarize";
type SpecialFunctionType = Exclude<AIFunction, "chat">; // 特殊功能
type ModifyFunctionType = "polish" | "expand" | "compress"; // 修改功能
type GenerateFunctionType = "plan" | "continue" | "summarize"; // 生成功能
```

### 2.3 Payload 与 Result

每种特殊功能都有对应的 Payload（输入）和 Result（输出）类型：

| 功能 | Payload | Result |
|------|---------|--------|
| polish/expand/compress | `ModifyPayload` (selectedText, enhancedContext) | `ModifyResult` (modifiedText, explanation) |
| plan | `PlanPayload` (nodeId, nodeName, nodeOutline, existingChildren...) | `PlanResult` (children[], explanation) |
| continue | `ContinuePayload` (nodeId, currentContent...) | `ContinueResult` (content) |
| summarize | `SummarizePayload` (nodeId, content, nodeType) | `SummarizeResult` (summary) |

---

## 3. 目录结构

```
src/lib/ai/
├── index.ts                    # 统一导出
├── settings.ts                 # 设置管理（localStorage 读写、加密）
├── context-builder.ts          # 上下文构建工具
│
├── types/                      # 类型定义
│   ├── index.ts                # 统一导出
│   ├── message.ts              # 消息类型（ChatMessage、Payload、Result）
│   ├── context.ts              # 上下文类型（UserContextItem、AIContext）
│   ├── function.ts             # 功能类型（AIFunction、FunctionMeta）
│   ├── provider.ts             # Provider 类型
│   └── settings.ts             # 设置类型
│
├── prompts/                    # Prompt 模板
│   ├── index.ts                # 统一导出
│   └── unified.ts              # 统一 Prompt 构建
│
├── providers/                  # AI Provider 实现
│   ├── index.ts                # Provider 注册表
│   ├── base.ts                 # OpenAI 兼容基类
│   ├── gemini.ts               # Google Gemini
│   └── siliconflow.ts          # SiliconFlow
│
└── hooks/                      # React Hooks
    ├── index.ts                # 统一导出
    └── use-ai-request.ts       # AI 请求 Hook

src/components/ai/
├── index.ts                    # 统一导出
├── ai-chat-window.tsx          # 聊天浮窗容器
├── ai-chat-input.tsx           # 输入框（支持 pending tag）
├── ai-chat-messages.tsx        # 消息列表
├── message-renderer.tsx        # 消息渲染器（分发到不同组件）
├── ai-context-tags.tsx         # 参考内容标签
├── ai-context-selector.tsx     # 参考内容选择器 Dialog
├── ai-context-menu.tsx         # 编辑器右键菜单
├── ai-modify-result-card.tsx   # 修改结果卡片
├── ai-plan-result-card.tsx     # 规划结果卡片
├── ai-special-request-card.tsx # 特殊请求卡片
└── ai-debug-panel.tsx          # Debug 面板

src/lib/stores/
└── ai-store.ts                 # AI 状态管理（Zustand）
```

---

## 4. 数据流

### 4.1 普通聊天流程

```
用户输入 → ai-chat-input.tsx
    │
    ▼
useAIRequest.sendRequest({ type: "chat", userInput, userContexts })
    │
    ├─→ addTextMessage("user", userInput, userContexts)  // 添加用户消息
    │
    ▼
POST /api/ai/chat
    │
    ├─→ buildUnifiedSystemPrompt(project)                // 构建 System Prompt
    ├─→ buildChatUserMessage(userInput, userContexts)    // 构建 User Message
    │
    ▼
Provider.chat() → SSE Stream
    │
    ▼
appendStreamingChatContent(chunk)                        // 流式更新
    │
    ▼
addTextMessage("assistant", fullContent)                 // 添加 AI 回复
```

### 4.2 特殊功能流程（以润色为例）

```
用户选中文本 → 右键菜单 → ai-context-menu.tsx
    │
    ▼
setPendingSpecialFunction({ functionType: "polish", payload, displayText })
    │
    ▼
ai-chat-input.tsx 显示 pending tag
    │
    ▼
用户点击发送（可选输入额外指令）
    │
    ▼
useAIRequest.sendRequest({ type: "special", functionType: "polish", payload, userInstruction })
    │
    ├─→ addSpecialRequest("polish", payload, userInstruction)  // 添加请求消息
    ├─→ addSpecialResult("polish", requestMessageId)           // 添加结果消息（空）
    │
    ▼
POST /api/ai/chat
    │
    ├─→ buildUnifiedSystemPrompt(project)
    ├─→ buildSpecialRequestUserMessage("polish", payload, userInstruction, userContexts)
    │
    ▼
Provider.chat() → SSE Stream
    │
    ▼
updateSpecialResult(resultMessageId, { streamingContent })     // 流式更新
    │
    ▼
parseModifyResult(fullContent)                                  // 解析 JSON
    │
    ▼
updateSpecialResult(resultMessageId, { result, isStreaming: false })
    │
    ▼
ai-modify-result-card.tsx 显示结果（应用/复制按钮）
```

### 4.3 规划功能流程

```
用户点击文件夹的"AI 规划"按钮 → folder-editor.tsx
    │
    ▼
buildPlanContext({ currentNode, allNodes, projectInfo, entities })
    │
    ▼
setPendingSpecialFunction({ functionType: "plan", payload, displayText })
    │
    ▼
toggleChatWindow(true)  // 打开聊天窗口
    │
    ▼
（后续流程同特殊功能）
    │
    ▼
ai-plan-result-card.tsx 显示结果
    │
    ▼
用户点击"应用" → 批量创建子节点
```

---

## 5. Prompt 架构

### 5.1 统一 System Prompt

所有功能共用一个通用的 System Prompt（`unified.ts`）：

```typescript
const UNIFIED_SYSTEM_PROMPT = `你是一位专业的小说写作助手...`;

function buildUnifiedSystemPrompt(project?: ProjectInfo): string {
  // 基础 Prompt + 项目信息
}
```

### 5.2 特殊功能指令注入

特殊功能的指令注入到用户消息中，而非 System Prompt：

```typescript
function buildSpecialRequestUserMessage(
  functionType: SpecialFunctionType,
  payload: unknown,
  userInstruction?: string,
  userContexts?: UserContextItem[]
): string {
  // 1. 任务描述（TASK_DESCRIPTIONS[functionType]）
  // 2. 参考上下文（formatUserContexts）
  // 3. 任务数据（formatModifyPayload / formatPlanPayload）
  // 4. 用户额外指令
  // 5. 结束语
}
```

### 5.3 输出格式

特殊功能要求 AI 输出 JSON 格式：

```json
// 修改功能
{ "result": "修改后的文本", "explanation": "修改说明" }

// 规划功能
{ "children": [{ "title": "...", "summary": "...", "type": "FOLDER|FILE" }], "explanation": "..." }
```

---

## 6. 状态管理

### 6.1 AI Store 核心状态

```typescript
interface AIState {
  // 设置
  settings: AISettings;
  
  // 项目信息
  currentProject: ProjectInfo | null;
  
  // 消息历史
  chatHistory: ChatMessage[];
  
  // 临时上下文（用于下次发送）
  pendingContexts: UserContextItem[];
  
  // 待发送的特殊功能（显示为输入框中的 tag）
  pendingSpecialFunction: PendingSpecialFunction | null;
  
  // 请求状态
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessageId: string | null;
  streamingChatContent: string;
  error: string | null;
  
  // 浮窗状态
  isChatWindowOpen: boolean;
  hasUnreadMessage: boolean;
}
```

### 6.2 关键 Actions

| Action | 说明 |
|--------|------|
| `addTextMessage` | 添加普通文本消息 |
| `addSpecialRequest` | 添加特殊功能请求消息 |
| `addSpecialResult` | 添加特殊功能结果消息（初始状态） |
| `updateSpecialResult` | 更新特殊功能结果（流式内容、最终结果、应用状态） |
| `setPendingSpecialFunction` | 设置待发送的特殊功能 |
| `addPendingContext` / `removePendingContext` | 管理临时上下文 |
| `consumePendingContexts` | 获取并清空临时上下文 |

---

## 7. Provider 架构

### 7.1 抽象基类

```typescript
abstract class OpenAICompatibleProvider implements AIProvider {
  abstract id: string;
  abstract name: string;
  abstract defaultBaseUrl: string;
  
  async validateKey(apiKey: string): Promise<boolean>;
  async listModels(apiKey: string): Promise<AIModel[]>;
  async *chat(config, params): AsyncGenerator<string>;  // 流式
  async chatSync(config, params): Promise<ChatResponse>; // 非流式
}
```

### 7.2 支持的 Provider

| Provider | 模型 | 特点 |
|----------|------|------|
| SiliconFlow | DeepSeek-V3.2 等 | 多模型、低成本 |
| Gemini | gemini-3-pro/flash-preview | Google 出品，文本能力强 |

### 7.3 自动选择逻辑

```typescript
function getModelForFunction(func: AIFunction): ModelConfig | null {
  // 1. 检查功能是否有指定模型
  // 2. 如果是 "auto"，遍历所有启用的 Provider，返回第一个可用的
  // 3. 如果没有启用的 Provider，返回 null
}
```

---

## 8. API 设计

### 8.1 统一入口

```
POST /api/ai/chat
```

### 8.2 请求体

```typescript
interface ChatRequestBody {
  requestType: "chat" | "special";
  functionType?: SpecialFunctionType;  // special 时必填
  provider: { id, apiKey, baseUrl?, model };
  messages: ProviderMessage[];         // 历史消息
  userInput?: string;                  // 用户输入
  payload?: unknown;                   // 特殊功能 payload
  userContexts?: UserContextItem[];    // 用户上下文
  project?: ProjectInfo;               // 项目信息
  stream?: boolean;                    // 是否流式（默认 true）
}
```

### 8.3 响应格式

**流式响应（SSE）：**
```
data: {"debug": {...}}           // 首条：debug 信息
data: {"content": "..."}         // 内容块
data: {"content": "..."}
data: [DONE]                     // 结束标记
```

**非流式响应：**
```json
{
  "success": true,
  "data": {
    "content": "...",
    "finishReason": "stop",
    "usage": { "promptTokens": 100, "completionTokens": 50 }
  }
}
```

---

## 9. 组件交互

### 9.1 Pending Special Function

当用户通过右键菜单触发特殊功能时：

1. `ai-context-menu.tsx` 调用 `setPendingSpecialFunction`
2. `ai-chat-input.tsx` 检测到 `pendingSpecialFunction` 不为空，显示 tag
3. 用户可以输入额外指令，或直接按 Enter 发送
4. 发送时，`pendingSpecialFunction` 被消费并清空

### 9.2 参考内容管理

- `pendingContexts`：用户手动添加的参考内容，显示在输入框上方
- `userContexts`（消息字段）：发送时附带的参考内容，用于消息气泡中显示

### 9.3 消息渲染

`message-renderer.tsx` 根据消息类型分发：

```typescript
if (isTextMessage(message)) → TextMessageBubble
if (isSpecialRequestMessage(message)) → AISpecialRequestCard
if (isSpecialResultMessage(message)) → AIModifyResultCard / AIPlanResultCard
```

---

## 10. 扩展指南

### 10.1 添加新的特殊功能

1. **定义类型**（`types/message.ts`）：
   - 添加 Payload 类型
   - 添加 Result 类型
   - 更新 `SpecialPayloadMap` 和 `SpecialResultMap`

2. **添加 Prompt**（`prompts/unified.ts`）：
   - 在 `TASK_DESCRIPTIONS` 中添加任务描述
   - 如需要，添加 payload 格式化函数

3. **更新 Hook**（`hooks/use-ai-request.ts`）：
   - 添加结果解析逻辑

4. **创建结果卡片**（`components/ai/`）：
   - 创建对应的结果展示组件

5. **更新消息渲染器**（`message-renderer.tsx`）：
   - 添加新功能的渲染分支

### 10.2 添加新的 Provider

1. 在 `providers/` 目录创建新文件
2. 继承 `OpenAICompatibleProvider` 或实现 `AIProvider` 接口
3. 在 `providers/index.ts` 中注册
4. 在 `types/settings.ts` 中更新默认设置

---

## 11. 已知限制

| 限制 | 说明 | 计划 |
|------|------|------|
| 续写/总结未实现 | Payload 格式化和结果卡片未完成 | 后续迭代 |
| 破限模式未实现 | 三重机制设计已有，代码未实现 | 后续迭代 |
| 移动端适配 | 浮窗在移动端体验不佳 | 后续优化 |
| 对话历史不持久化 | 刷新页面后丢失 | 后续优化 |
