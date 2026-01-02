# Vibe Coding 规范

> AI 辅助开发的工作流程与约定

## 0. 项目信息

| 项目 | 地址 |
|------|------|
| GitHub | https://github.com/billyblu2000/ai-novel |
| Vercel | https://ai-novel-ten.vercel.app/ |

---

## 1. Git 提交规范

### 1.1 自动提交时机

AI 在完成以下节点时自动执行 `git add . && git commit && git push`：

| 时机 | 示例 |
|------|------|
| 完成一个小阶段 (Phase X.Y) | Phase 1.1 环境搭建 |
| 完成一个独立功能模块 | 文件树拖拽排序 |
| 重要配置变更 | 数据库 Schema 定义 |

### 1.2 Commit Message 格式

```
<type>(<scope>): <subject>

[可选 body]
```

**Type 类型：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档变更
- `style`: 代码格式（不影响逻辑）
- `refactor`: 重构
- `chore`: 构建/工具变更
- `init`: 项目初始化

**示例：**
```
feat(phase1.1): 完成环境搭建

- 创建 Next.js 15 项目
- 配置 Tailwind CSS + Shadcn/ui
- 配置 ESLint + Prettier
- 创建基础目录结构
```

---

## 2. 开发流程

### 2.1 阶段执行顺序

1. **阅读 PRD.md** - 理解需求和技术约束
2. **查看 PROGRESS.md** - 确认当前进度和待办事项
3. **执行开发** - 按 Phase 顺序实现
4. **更新 PROGRESS.md** - 标记完成项，更新变更日志
5. **Git 提交** - 按规范提交代码

### 2.2 代码质量检查

每次提交前确保：
- [ ] `npm run build` 构建成功
- [ ] 无 TypeScript 类型错误
- [ ] 无 ESLint 错误

---

## 3. 文件组织约定

### 3.1 目录结构

```
src/
├── app/                 # Next.js App Router 页面
├── components/
│   ├── ui/              # Shadcn 基础组件
│   ├── editor/          # 编辑器相关
│   ├── binder/          # 文件树相关
│   └── ...
├── lib/
│   ├── db/              # 数据库相关
│   ├── hooks/           # 自定义 Hooks
│   ├── stores/          # Zustand Stores
│   └── utils.ts         # 工具函数
└── types/               # TypeScript 类型定义
```

### 3.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `FileTree.tsx` |
| 工具/Hook | camelCase | `useNodes.ts` |
| 类型文件 | camelCase | `index.ts` |
| CSS/样式 | kebab-case | `globals.css` |

---

## 4. AI 协作约定

### 4.1 沟通原则

- **简洁直接**：不需要过多解释，直接执行
- **主动推进**：完成当前任务后可建议下一步
- **及时更新**：每完成一个阶段更新 PROGRESS.md

### 4.2 决策记录

重要技术决策记录在 `DECISIONS.md`，包括：
- 决策内容
- 选择原因
- 备选方案

---

## 5. 变更日志

| 日期 | 变更内容 |
|------|----------|
| 2026-01-03 | 创建 Vibe Coding 规范文档 |
