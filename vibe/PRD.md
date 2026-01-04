# AI-Native Novel Studio (Web Platform)

## 1. 项目概述 (Project Overview)

这是一个本地优先、AI 增强的长篇小说写作平台。核心理念是**"结构化写作"**。它不仅仅是一个文本生成器，更是一个拥有无限层级目录、自动实体关联、可视化时间线的专业写作 IDE。AI 在其中扮演"副驾驶"角色，负责基于上下文的扩写、润色和世界观管理。

### 架构原则

| 原则 | 说明 |
|------|------|
| **本地优先** | UI 交互、编辑、计算在本地完成，采用乐观更新策略 |
| **云端 AI** | AI 推理必须在云端执行，本地不做模型推理 |
| **乐观更新** | 本地先更新 UI，后台异步同步到 Supabase，失败时回滚并提示 |
| **成本敏感** | 最小化 Edge Function 调用，批量操作优先，避免高频触发 |

---

## 2. 技术栈约束 (Tech Stack Constraints)

> ⚠️ 严禁偏离以下选型，保持系统轻量且 Serverless 化

| 层级 | 技术选型 |
|------|----------|
| **Frontend** | Next.js 14/15 (App Router), React, TypeScript (Strict Mode) |
| **Styling** | Tailwind CSS, Shadcn/ui (Radix primitives), Lucide Icons |
| **State Management** | Zustand (Global store), TanStack Query (Server state + Optimistic Updates) |
| **Editor** | Tiptap (Headless, supports Markdown shortcuts) |
| **Backend/DB** | Supabase (Auth, PostgreSQL, Vector, Realtime) |
| **ORM** | Drizzle ORM (常规表), Supabase JS Client (Vector 操作) |
| **AI Integration** | Vercel AI SDK (Core & UI), OpenAI/Anthropic/DeepSeek API compatibility |
| **Validation** | Zod (Schema validation) |
| **Drag & Drop** | @dnd-kit (使用 fractional indexing 排序) |
| **Offline Storage** | IndexedDB (via `idb-keyval` 轻量封装) |
| **Deployment** | Vercel |

### 技术说明

- **Drizzle + Vector**: Drizzle 用于常规 CRUD，`pgvector` 相关操作（embedding 存储/相似度搜索）使用 Supabase JS Client 的 `rpc()` 调用
- **排序算法**: 使用 fractional indexing（如 `fractional-indexing` 库），避免跨层级拖拽时批量更新 order
- **离线存储**: 使用 IndexedDB 存储离线操作队列，网络恢复后批量同步

---

## 3. 核心数据架构 (Core Data Architecture)

> 这是系统的灵魂。AI 必须严格遵循此 Schema 设计。

### 3.1 用户与项目

**Profiles**: 扩展 Supabase Auth

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键，关联 auth.users |
| `nickname` | String | 昵称 |
| `avatar_url` | String | 头像 URL |
| `created_at` | Timestamp | 创建时间 |

**Projects**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `user_id` | FK | 关联 Profiles |
| `title` | String | 项目标题 |
| `cover_image` | String | 封面图 URL |
| `created_at` | Timestamp | 创建时间 |
| `updated_at` | Timestamp | 最后更新时间 |

### 3.2 递归文件树 (The Binder System)

所有目录、章节、大纲都存储在统一的 **Nodes** 表中，实现无限层级。

**Nodes Table**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `project_id` | FK | 关联项目 |
| `parent_id` | FK, Nullable | 实现树状结构，NULL 表示根节点 |
| `type` | ENUM | `'FOLDER'` \| `'FILE'` |
| `title` | String | 标题 |
| `content` | Text | FILE 存正文，FOLDER 此字段为空 |
| `outline` | Text | FOLDER 存用户编写的大纲计划 |
| `summary` | Text | FILE 存场景概要（可由 AI 生成或用户填写） |
| `order` | String | Fractional index，用于拖拽排序 |
| `metadata` | JSONB | 元数据 |
| `created_at` | Timestamp | 创建时间 |
| `updated_at` | Timestamp | 最后更新时间 |

**Metadata 结构**:

- **FILE (Scene)**:
  ```json
  { 
    "timestamp": "ISO-Date | null",
    "location_ref": "UUID | null", 
    "status": "DRAFT" | "FINAL",
    "word_count": 0,
    "ignored_entities": ["实体名1", "实体名2"]
  }
  ```
- **FOLDER (Chapter)**:
  ```json
  { 
    "collapsed": false
  }
  ```

> **字段说明**:
> - `outline`: FOLDER 专用，存储用户编写的章节大纲/写作计划，用于 AI 生成场景
> - `summary`: FILE 专用，存储场景概要，用于时间线显示和 AI 上下文
> - `ignored_entities`: 用户右键"忽略"的实体名称，高亮时跳过

### 3.3 版本历史 (Node Versions)

**Node_Versions Table**: 用于内容回溯

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `node_id` | FK | 关联节点 |
| `content` | Text | 历史内容快照 |
| `word_count` | Integer | 快照时的字数 |
| `created_at` | Timestamp | 版本创建时间 |

**版本创建策略** (成本优化):

| 条件 | 说明 |
|------|------|
| **触发时机** | 用户手动保存 (`Ctrl+S`) 或切换到其他节点时 |
| **最小间隔** | 距上次版本至少 **5 分钟** |
| **最小变化** | 内容变化超过 **200 字符** |
| **版本上限** | 每节点最多 **20 个版本**，超出删除最旧的 |

> 不在每次自动保存时创建版本，避免版本爆炸

### 3.4 世界观实体 (World Building)

**Entities Table**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `project_id` | FK | 关联项目 |
| `type` | ENUM | `'CHARACTER'` \| `'LOCATION'` \| `'ITEM'` |
| `name` | String | 项目内唯一，用于匹配（最大 50 字符） |
| `aliases` | String[] | 别名数组，用于匹配，如 `["小明", "明哥"]` |
| `description` | Text | AI 上下文来源 |
| `attributes` | JSONB | 键值对，如 `{ "Age": 20, "Weapon": "Sword" }` |
| `avatar_url` | String | 实体头像/图片 |
| `embedding` | Vector(1536) | 用于 RAG 检索 |
| `created_at` | Timestamp | 创建时间 |
| `updated_at` | Timestamp | 最后更新时间 |

> **约束**: 单个项目实体上限 **200 个**（降低以优化性能），超出需提示用户清理

### 3.5 实体引用 (Entity Mentions)

**Mentions Table**: 用于追踪正文中哪里提到了谁

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `node_id` | FK | 关联节点 |
| `entity_id` | FK | 关联实体 |
| `frequency` | Integer | 出现次数 |

> **设计决策**: 移除 `positions` 字段，只保留频次统计。原因：
> 1. 字符偏移量在编辑时需要频繁重算，成本高
> 2. 实体高亮已在前端实时计算，无需后端存储位置
> 3. 频次足够用于"关联实体"排序和 AI 上下文选择

**更新策略** (成本优化):

| 项目 | 说明 |
|------|------|
| **计算位置** | 前端本地，使用 Web Worker |
| **更新时机** | 用户离开编辑器（切换节点/关闭页面）时批量提交 |
| **防抖** | 至少间隔 **30 秒** 才允许再次更新同一节点 |

---

## 4. 关键功能模块 (Feature Specifications)

### 4.1 智能编辑器 (The Intelligent Editor)

基于 **Tiptap** 实现。

#### 被动实体高亮 (Passive Entity Highlighting)

| 项目 | 说明 |
|------|------|
| **Logic** | 编辑器加载时，获取当前项目所有 Entity Name + Aliases |
| **Algorithm** | 使用 Aho-Corasick 算法在 Web Worker 中匹配，避免阻塞主线程 |
| **Performance** | 实体上限 200 个，名称+别名总词条上限 800 |
| **UI** | 匹配到的词汇显示为淡紫色虚线下划线 (`border-b border-dashed border-purple-300`) |
| **Interaction** | Hover 时显示 Entity 卡片（延迟 300ms）。支持右键"忽略此匹配" |
| **忽略存储** | 存入当前节点的 `metadata.ignored_entities` 数组 |

> **AI 功能**：详见 [PRD_AI.md](./PRD_AI.md)

### 4.2 目录与大纲联动 (Binder & Outline)

#### 左侧 Sidebar (File Tree)

- 使用 `@dnd-kit` 实现拖拽
- 支持无限层级嵌套
- 拖拽排序使用 fractional indexing
- 支持快捷键：`Ctrl+N` 新建，`F2` 重命名，`Delete` 删除

#### 中间区域 (Main View)

| 点击类型 | 显示内容 |
|----------|----------|
| **FILE** | Tiptap 编辑器，加载正文 |
| **FOLDER** | 大纲编辑器（编辑 `outline` 字段） + 子节点卡片列表 |

### 4.3 动态时间线 (Timeline View)

| 项目 | 说明 |
|------|------|
| **Logic** | 不单独建表，从 Nodes 动态查询 |
| **Query** | 查询所有 `type=FILE` 且 `metadata.timestamp IS NOT NULL` 的节点 |
| **Sort** | 按 `metadata.timestamp` 升序排列 |
| **UI** | 垂直时间轴，显示：时间点、场景标题、summary 摘要、关联地点 |
| **Interaction** | 点击跳转到对应场景编辑 |

### 4.4 实体管理 (Wiki Sidebar)

#### Right Sidebar

| 模式 | 显示内容 |
|------|----------|
| **Context Mode** | 当前场景关联的实体（基于 Mentions 表，按 frequency 降序） |
| **Browse Mode** | 按类型分组的实体列表（CHARACTER / LOCATION / ITEM） |

#### 实体卡片

- 显示：头像、名称、类型标签、描述摘要
- 点击展开完整信息 + 属性列表
- 支持内联编辑

#### Embedding 更新策略 (成本优化)

| 项目 | 说明 |
|------|------|
| **触发时机** | 实体 `description` 更新后，标记为 `embedding_dirty = true` |
| **批量处理** | 用户关闭项目或每 **10 分钟** 检查一次，批量更新所有 dirty 实体 |
| **API 调用** | 单次 API 调用可批量生成多个 embedding，减少请求次数 |

### 4.5 项目仪表盘 (Project Dashboard)

> 项目首页，提供全局视图

| 模块 | 说明 |
|------|------|
| **统计卡片** | 总字数、章节数、场景数、实体数 |
| **最近编辑** | 最近修改的 5 个场景 |
| **写作进度** | 按章节显示完成状态（DRAFT/FINAL） |

---

## 5. UI/UX 风格指南 (Design System)

### 设计理念

> **Vercel-Inspired Minimalism** - 黑白简洁，专注内容

| 原则 | 说明 |
|------|------|
| **极简主义** | 去除一切不必要的装饰，让内容成为主角 |
| **黑白为主** | 主色调为黑白灰，仅在关键交互处使用强调色 |
| **留白呼吸** | 充足的 padding 和 margin，界面不拥挤 |
| **微妙层次** | 通过细微的阴影、边框、透明度区分层级，而非浓重色彩 |
| **流畅动效** | 简短、克制的过渡动画（150-300ms），不花哨 |

### 色彩系统

#### Light Mode

| 用途 | 色值 | 说明 |
|------|------|------|
| **Background** | `#FFFFFF` | 纯白背景 |
| **Background Subtle** | `#FAFAFA` | 侧边栏、卡片背景 |
| **Border** | `#EAEAEA` | 边框、分割线 |
| **Text Primary** | `#171717` | 主要文字 |
| **Text Secondary** | `#666666` | 次要文字、描述 |
| **Text Muted** | `#999999` | 占位符、禁用态 |
| **Accent** | `#000000` | 强调色（按钮、链接） |
| **Accent Hover** | `#333333` | 强调色悬停态 |
| **Success** | `#50E3C2` | 成功状态（Vercel 绿） |
| **Error** | `#FF0000` | 错误状态 |
| **Entity Highlight** | `#F3E8FF` | 实体高亮背景（淡紫） |

#### Dark Mode

| 用途 | 色值 | 说明 |
|------|------|------|
| **Background** | `#000000` | 纯黑背景 |
| **Background Subtle** | `#111111` | 侧边栏、卡片背景 |
| **Border** | `#333333` | 边框、分割线 |
| **Text Primary** | `#EDEDED` | 主要文字 |
| **Text Secondary** | `#A1A1A1` | 次要文字、描述 |
| **Text Muted** | `#666666` | 占位符、禁用态 |
| **Accent** | `#FFFFFF` | 强调色（按钮、链接） |
| **Accent Hover** | `#CCCCCC` | 强调色悬停态 |
| **Success** | `#50E3C2` | 成功状态 |
| **Error** | `#FF4444` | 错误状态 |
| **Entity Highlight** | `#2D1F3D` | 实体高亮背景（暗紫） |

### Layout

| 区域 | 说明 |
|------|------|
| **Left Sidebar** | Navigation/File Tree (Collapsible, 250px, 最小 48px 图标模式) |
| **Center** | Editor/Dashboard (flex-1, 内容区 MaxWidth 800px 居中) |
| **Right Sidebar** | Context/Entity Panel (Collapsible, 300px) |

### Typography

| 用途 | 字体 | 字号 | 字重 |
|------|------|------|------|
| **正文内容** | Noto Serif SC / Merriweather | 16px / 1.8 行高 | 400 |
| **UI 文字** | Inter | 14px / 1.5 行高 | 400-500 |
| **标题 H1** | Inter | 24px | 600 |
| **标题 H2** | Inter | 18px | 600 |
| **代码/等宽** | JetBrains Mono | 14px | 400 |
| **小字/标签** | Inter | 12px | 500 |

### 间距系统

基于 4px 网格：

| Token | 值 | 用途 |
|-------|-----|------|
| `space-1` | 4px | 紧凑元素内间距 |
| `space-2` | 8px | 图标与文字间距 |
| `space-3` | 12px | 列表项间距 |
| `space-4` | 16px | 卡片内间距 |
| `space-6` | 24px | 区块间距 |
| `space-8` | 32px | 大区块分隔 |

### 核心组件样式

使用 Shadcn/ui，覆盖为 Vercel 风格：

| 组件 | 样式要点 |
|------|----------|
| `Button` | 默认黑底白字，hover 变灰；Ghost 变体无背景 |
| `Card` | 1px 边框，无阴影或极淡阴影 (`shadow-sm`) |
| `Input` | 1px 边框，focus 时边框变黑 |
| `Dialog` | 居中弹出，背景 blur 遮罩 |
| `Tooltip` | 黑底白字，圆角 6px |
| `Toast` | 右下角弹出，黑底白字 |

### 动效规范

| 场景 | 时长 | 缓动函数 |
|------|------|----------|
| Hover 状态变化 | 150ms | `ease-out` |
| 弹窗出现/消失 | 200ms | `ease-in-out` |
| 侧边栏展开/收起 | 250ms | `ease-in-out` |
| 页面切换 | 300ms | `ease-out` |

### 响应式断点

| 断点 | 行为 |
|------|------|
| `< 768px` | 隐藏双侧边栏，使用 Sheet 抽屉 |
| `768px - 1024px` | 左侧边栏常驻，右侧按需展开 |
| `> 1024px` | 三栏布局 |

### 图标规范

- 使用 **Lucide Icons**（与 Shadcn 默认一致）
- 图标尺寸：16px（小）、20px（中）、24px（大）
- 图标颜色跟随文字颜色，不单独着色

---

## 6. 数据同步策略 (Data Sync Strategy)

### 6.1 乐观更新原则

1. **即时反馈**: 用户操作立即反映在 UI 上
2. **后台同步**: 异步将变更推送到 Supabase
3. **冲突处理**: 失败时回滚 UI 并 Toast 提示
4. **离线队列**: 网络断开时，操作存入 IndexedDB，恢复后批量同步

### 6.2 实现方式

使用 TanStack Query 的 `useMutation` + `onMutate` / `onError` / `onSettled`：

```typescript
// 伪代码示例
const updateNode = useMutation({
  mutationFn: (data) => supabase.from('nodes').update(data),
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['nodes'])
    const previous = queryClient.getQueryData(['nodes'])
    queryClient.setQueryData(['nodes'], (old) => /* optimistic update */)
    return { previous }
  },
  onError: (err, _, context) => {
    queryClient.setQueryData(['nodes'], context.previous)
    toast.error('保存失败，已回滚')
  },
  onSettled: () => queryClient.invalidateQueries(['nodes'])
})
```

### 6.3 操作分类与同步策略

| 操作类型 | 同步策略 | 说明 |
|----------|----------|------|
| 节点重命名 | 立即同步 | 防抖 500ms |
| 节点拖拽排序 | 立即同步 | 拖拽结束时 |
| 内容编辑 | 延迟同步 | 防抖 **3 秒**，或切换节点时 |
| 实体 CRUD | 立即同步 | 无防抖 |
| Mentions 更新 | 批量同步 | 切换节点或关闭页面时 |
| Embedding 更新 | 批量同步 | 关闭项目或定时 10 分钟 |

### 6.4 离线队列

| 项目 | 说明 |
|------|------|
| **存储** | IndexedDB（使用 `idb-keyval`） |
| **结构** | `{ id, table, action, data, timestamp }` |
| **恢复** | 网络恢复时，按 timestamp 顺序重放 |
| **冲突** | 使用 `updated_at` 字段做 Last-Write-Wins |

### 6.5 多设备冲突处理

> 不支持实时协作，但需处理同一用户多设备场景

| 策略 | 说明 |
|------|------|
| **检测** | 保存前检查 `updated_at` 是否与本地一致 |
| **提示** | 不一致时弹窗："内容已在其他设备更新，是否覆盖？" |
| **选项** | 覆盖 / 放弃本地修改 / 另存为新版本 |

---

## 7. 认证与安全 (Authentication & Security)

### 7.1 认证流程

| 项目 | 说明 |
|------|------|
| **Provider** | Supabase Auth |
| **登录方式** | Email/Password, GitHub OAuth, Google OAuth |
| **Session** | JWT，存储在 HttpOnly Cookie |
| **刷新** | 自动刷新，过期前 5 分钟 |

### 7.2 页面路由

| 路由 | 访问权限 |
|------|----------|
| `/` | 公开，Landing Page |
| `/login`, `/signup` | 未登录用户 |
| `/projects`, `/editor/*` | 需登录 |

### 7.3 Row Level Security (RLS)

所有表启用 RLS，策略：

```sql
-- 示例：用户只能访问自己的项目
CREATE POLICY "Users can only access own projects"
ON projects FOR ALL
USING (auth.uid() = user_id);

-- 级联：节点只能访问自己项目下的
CREATE POLICY "Users can only access nodes in own projects"
ON nodes FOR ALL
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);
```

### 7.4 级联删除

| 删除对象 | 级联删除 |
|----------|----------|
| Project | → Nodes, Entities, Mentions, Node_Versions |
| Node | → Mentions (该节点的), Node_Versions |
| Entity | → Mentions (该实体的) |

---

## 8. AI 行为规范 (AI Development Rules)

| 规范 | 说明 |
|------|------|
| **Don't Repeat Yourself** | 所有 UI 组件封装在 `components/ui`，业务组件在 `components/` 子目录 |
| **Type Safety** | 所有 API 接口必须有 Zod Schema + TypeScript Interface |
| **Error Handling** | API 失败通过 `sonner` Toast 提示，包含重试按钮 |
| **Loading States** | 所有异步操作需显示 loading 状态（Skeleton / Spinner） |
| **Accessibility** | 遵循 WAI-ARIA，支持键盘导航 |

### File Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # 认证相关页面
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/          # 登录后页面
│   │   ├── projects/         # 项目列表
│   │   └── editor/[id]/      # 编辑器主页面
│   └── api/                  # API Routes
│       └── ai/               # AI 相关接口
├── components/
│   ├── ui/                   # Shadcn 基础组件
│   ├── editor/               # Tiptap 编辑器相关
│   ├── binder/               # 文件树组件
│   ├── entities/             # 实体/Wiki 组件
│   └── timeline/             # 时间线组件
├── lib/
│   ├── db/                   # Drizzle schema & client
│   ├── supabase/             # Supabase client & helpers
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand stores
│   ├── ai/                   # AI prompts & actions
│   ├── offline/              # IndexedDB 离线队列
│   └── utils/                # 工具函数
└── types/                    # 全局类型定义
```

---

## 9. API 设计 (API Design)

> 所有 API 使用 Next.js App Router 的 Route Handlers 实现

### 9.1 RESTful 端点

#### Projects

| Method | Endpoint | 说明 |
|--------|----------|------|
| `GET` | `/api/projects` | 获取当前用户所有项目 |
| `POST` | `/api/projects` | 创建新项目 |
| `GET` | `/api/projects/[id]` | 获取单个项目详情 |
| `PATCH` | `/api/projects/[id]` | 更新项目（标题、封面） |
| `DELETE` | `/api/projects/[id]` | 删除项目（级联删除所有关联数据） |

#### Nodes

| Method | Endpoint | 说明 |
|--------|----------|------|
| `GET` | `/api/projects/[id]/nodes` | 获取项目下所有节点（树形结构） |
| `POST` | `/api/projects/[id]/nodes` | 创建节点 |
| `PATCH` | `/api/nodes/[id]` | 更新节点（标题、内容、排序等） |
| `DELETE` | `/api/nodes/[id]` | 删除节点（级联删除子节点） |
| `POST` | `/api/nodes/[id]/move` | 移动节点（更新 parent_id 和 order） |

#### Entities

| Method | Endpoint | 说明 |
|--------|----------|------|
| `GET` | `/api/projects/[id]/entities` | 获取项目下所有实体 |
| `POST` | `/api/projects/[id]/entities` | 创建实体 |
| `PATCH` | `/api/entities/[id]` | 更新实体 |
| `DELETE` | `/api/entities/[id]` | 删除实体 |

#### Mentions

| Method | Endpoint | 说明 |
|--------|----------|------|
| `GET` | `/api/nodes/[id]/mentions` | 获取节点关联的实体 |
| `PUT` | `/api/nodes/[id]/mentions` | 批量更新节点的 Mentions（全量替换） |

#### Versions

| Method | Endpoint | 说明 |
|--------|----------|------|
| `GET` | `/api/nodes/[id]/versions` | 获取节点的版本历史 |
| `POST` | `/api/nodes/[id]/versions` | 手动创建版本快照 |
| `POST` | `/api/nodes/[id]/versions/[versionId]/restore` | 恢复到指定版本 |

### 9.2 AI 端点

> AI 功能详见 [PRD_AI.md](./PRD_AI.md)，此处仅列出端点概览

| Method | Endpoint | 说明 |
|--------|----------|------|
| `POST` | `/api/ai/chat` | 统一 AI 请求入口（润色/扩写/缩写/续写/规划/总结/聊天） |

---

## 10. 后续规划 (Future Roadmap)

> 以下功能不在 MVP 范围内，后期迭代

| 功能 | 优先级 | 说明 |
|------|--------|------|
| **全文搜索** | P1 | 使用 Supabase Full-Text Search |
| **导出功能** | P1 | 支持 Markdown / Word / ePub |
| **AI 功能** | P1 | 详见 [PRD_AI.md](./PRD_AI.md) |
| **移动端适配** | P2 | PWA 支持 |
| **插件系统** | P3 | 允许用户自定义 AI Prompt 模板 |

---

## 12. 性能约束 (Performance Constraints)

> 定义关键性能指标，避免过度设计

| 指标 | 目标值 | 说明 |
|------|--------|------|
| **编辑器首屏加载** | < 2s | 包含文件树 + 首个场景内容 |
| **场景切换** | < 500ms | 切换到另一个场景 |
| **AI 首字响应** | < 1s | Streaming 首个 token 到达 |
| **文件树节点上限** | 500 个 | 单项目最大节点数 |
| **单场景最大字数** | 50,000 字 | 超出建议拆分 |
| **实体总数上限** | 200 个 | 单项目 |
| **并发请求** | 3 个 | AI 请求最大并发数 |
