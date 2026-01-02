# AI Novel Studio - 开发进度

> 最后更新: 2026-01-03

## 整体进度

| 阶段 | 状态 | 完成度 |
|------|------|--------|
| 项目初始化 | 🔶 进行中 | 66% |
| 数据库 & 认证 | 🔲 未开始 | 0% |
| 核心 UI 框架 | 🔲 未开始 | 0% |
| 文件树 (Binder) | 🔲 未开始 | 0% |
| 编辑器 | 🔲 未开始 | 0% |
| 实体管理 | 🔲 未开始 | 0% |
| AI 功能 | 🔲 未开始 | 0% |
| 时间线 | 🔲 未开始 | 0% |
| 优化 & 收尾 | 🔲 未开始 | 0% |

---

## Phase 1: 项目初始化

### 1.1 环境搭建
- [x] 创建 Next.js 15 项目 (App Router, TypeScript)
- [x] 配置 Tailwind CSS
- [x] 安装并配置 Shadcn/ui
- [x] 配置 ESLint + Prettier
- [x] 创建基础目录结构 (`src/app`, `src/components`, `src/lib`, `src/types`)
- [x] 首次部署到 Vercel (尽早验证部署流程)

### 1.2 基础配置
- [x] 配置 Zustand store 基础结构
- [x] 配置 TanStack Query provider
- [x] 配置 Sonner (Toast)
- [x] 配置字体 (Inter, Noto Serif SC, JetBrains Mono)
- [x] 配置 Dark Mode (next-themes)

### 1.3 Supabase 初始化
- [ ] 创建 Supabase 项目
- [ ] 配置环境变量 (`.env.local`)
- [ ] 安装 Supabase JS Client
- [ ] 配置 Drizzle ORM

---

## Phase 2: 数据库 & 认证

### 2.1 数据库 Schema
- [ ] 创建 `profiles` 表 + RLS
- [ ] 创建 `projects` 表 + RLS
- [ ] 创建 `nodes` 表 + RLS
- [ ] 创建 `entities` 表 + RLS
- [ ] 创建 `mentions` 表 + RLS
- [ ] 创建 `node_versions` 表 + RLS
- [ ] 配置级联删除约束
- [ ] 创建 Drizzle schema 文件

### 2.2 认证系统
- [ ] 配置 Supabase Auth
- [ ] 实现登录页面 (`/login`)
- [ ] 实现注册页面 (`/signup`)
- [ ] 实现 OAuth (GitHub, Google)
- [ ] 实现 Auth Middleware (保护路由)
- [ ] 实现登出功能
- [ ] 创建 Profile 自动创建 trigger

---

## Phase 3: 核心 UI 框架

### 3.1 布局组件
- [ ] 创建 `AppShell` 三栏布局组件
- [ ] 创建 `LeftSidebar` 组件 (可折叠)
- [ ] 创建 `RightSidebar` 组件 (可折叠)
- [ ] 创建 `MainContent` 组件
- [ ] 实现响应式断点逻辑
- [ ] 实现侧边栏折叠动画

### 3.2 Landing Page
- [ ] 创建首页 (`/`)
- [ ] Hero 区域
- [ ] 功能介绍
- [ ] CTA 按钮

### 3.3 项目列表页
- [ ] 创建项目列表页 (`/projects`)
- [ ] 项目卡片组件
- [ ] 创建项目 Dialog
- [ ] 删除项目确认 Dialog
- [ ] 空状态展示

---

## Phase 4: 文件树 (Binder)

### 4.1 数据层
- [ ] 实现 `useNodes` hook (TanStack Query)
- [ ] 实现节点 CRUD API routes
- [ ] 实现乐观更新逻辑
- [ ] 实现 fractional indexing 排序

### 4.2 UI 组件
- [ ] 创建 `FileTree` 组件
- [ ] 创建 `TreeNode` 组件 (FOLDER/FILE 图标)
- [ ] 实现 @dnd-kit 拖拽排序
- [ ] 实现跨层级拖拽
- [ ] 实现右键菜单 (新建/重命名/删除)
- [ ] 实现快捷键 (Ctrl+N, F2, Delete)
- [ ] 实现节点展开/折叠

### 4.3 项目仪表盘
- [ ] 创建仪表盘页面 (`/editor/[id]`)
- [ ] 统计卡片 (字数/章节/场景/实体)
- [ ] 最近编辑列表
- [ ] 写作进度展示

---

## Phase 5: 编辑器

### 5.1 Tiptap 基础
- [ ] 安装 Tiptap 及扩展
- [ ] 创建 `Editor` 组件
- [ ] 配置基础扩展 (Document, Paragraph, Text, History)
- [ ] 配置 Markdown 快捷键
- [ ] 实现内容自动保存 (防抖 3s)
- [ ] 实现 `Ctrl+S` 手动保存

### 5.2 FOLDER 视图
- [ ] 创建大纲编辑器 (编辑 `outline` 字段)
- [ ] 创建子节点卡片列表
- [ ] 实现卡片点击跳转

### 5.3 FILE 视图
- [ ] 创建正文编辑器
- [ ] 实现字数统计
- [ ] 实现场景元数据编辑 (timestamp, location, status)

### 5.4 版本历史
- [ ] 实现版本创建逻辑 (5分钟间隔 + 200字符变化)
- [ ] 创建版本历史面板
- [ ] 实现版本预览
- [ ] 实现版本恢复

---

## Phase 6: 实体管理

### 6.1 数据层
- [ ] 实现 `useEntities` hook
- [ ] 实现实体 CRUD API routes
- [ ] 实现 Mentions 更新逻辑

### 6.2 Right Sidebar
- [ ] 创建 `EntitySidebar` 组件
- [ ] 实现 Context Mode (当前场景关联实体)
- [ ] 实现 Browse Mode (按类型分组)
- [ ] 创建实体卡片组件
- [ ] 实现实体详情展开

### 6.3 实体 CRUD
- [ ] 创建新实体 Dialog
- [ ] 实现实体编辑 (内联)
- [ ] 实现实体删除
- [ ] 实现别名管理
- [ ] 实现属性 (attributes) 编辑

### 6.4 实体高亮
- [ ] 实现 Aho-Corasick 匹配 (Web Worker)
- [ ] 创建 Tiptap 高亮扩展
- [ ] 实现 Hover 卡片 (Tooltip)
- [ ] 实现右键"忽略此匹配"
- [ ] 存储 `ignored_entities` 到 metadata

---

## Phase 7: AI 功能

### 7.1 基础设施
- [ ] 配置 Vercel AI SDK
- [ ] 配置 AI Provider (OpenAI/DeepSeek)
- [ ] 创建 Prompt 模板文件
- [ ] 实现上下文构建函数

### 7.2 选中文字菜单
- [ ] 创建 Floating Menu 组件
- [ ] 实现润色功能 (`/api/ai/polish`)
- [ ] 实现扩写功能 (`/api/ai/expand`)
- [ ] 实现缩写功能 (`/api/ai/compress`)
- [ ] 实现翻译功能 (`/api/ai/translate`)
- [ ] 实现 Streaming 显示

### 7.3 AI 命令面板
- [ ] 创建 Command Palette (`/` 触发)
- [ ] 实现自由对话 (`/api/ai/chat`)
- [ ] 实现生成场景 (`/api/ai/generate-scenes`)
- [ ] 实现生成摘要 (`/api/ai/summarize`)

### 7.4 Embedding (可选，后期)
- [ ] 实现 Embedding 生成
- [ ] 实现 dirty 标记逻辑
- [ ] 实现批量更新

---

## Phase 8: 时间线

### 8.1 数据层
- [ ] 实现时间线查询 (带 timestamp 的 FILE 节点)

### 8.2 UI 组件
- [ ] 创建 `Timeline` 组件
- [ ] 创建时间线节点卡片
- [ ] 实现点击跳转到场景
- [ ] 实现空状态提示

---

## Phase 9: 优化 & 收尾

### 9.1 离线支持
- [ ] 配置 idb-keyval
- [ ] 实现离线队列
- [ ] 实现网络恢复后同步
- [ ] 实现多设备冲突检测

### 9.2 性能优化
- [ ] 编辑器懒加载
- [ ] 文件树虚拟滚动 (如节点过多)
- [ ] 图片懒加载

### 9.3 最终测试
- [ ] 全流程手动测试
- [ ] 修复发现的 Bug

---

## 变更日志

| 日期 | 变更内容 |
|------|----------|
| 2026-01-03 | 完成 Phase 1.2 基础配置 |
| 2026-01-03 | 完成 Phase 1.1 环境搭建 |
| 2026-01-03 | 初始化进度文档 |
