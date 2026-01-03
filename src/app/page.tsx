import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Sparkles,
  FolderTree,
  Users,
  Clock,
  ArrowRight,
  Github,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5" />
            <span>AI Novel Studio</span>
          </div>
          <nav className="ml-auto flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              登录
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">开始创作</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container flex flex-1 flex-col items-center justify-center gap-8 py-20 text-center md:py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm">
            <Sparkles className="mr-2 h-3 w-3" />
            AI 驱动的写作体验
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            用 AI 重新定义
            <br />
            <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              长篇小说创作
            </span>
          </h1>
          <p className="max-w-[600px] text-lg text-muted-foreground md:text-xl">
            AI Novel Studio
            是一个本地优先、AI增强的专业写作平台。无限层级目录、智能实体管理、可视化时间线，让你的创作更高效。
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href="/signup">
              免费开始
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link
              href="https://github.com/billyblu2000/ai-novel"
              target="_blank"
            >
              <Github className="h-4 w-4" />
              GitHub
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              为专业写作者打造
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              不只是文本生成器，而是完整的写作 IDE
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group relative rounded-lg border bg-background p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FolderTree className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">无限层级目录</h3>
              <p className="text-muted-foreground">
                像 Scrivener 一样组织你的作品。支持无限嵌套的章节结构，拖拽排序，让大纲管理更直观。
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative rounded-lg border bg-background p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">智能实体管理</h3>
              <p className="text-muted-foreground">
                自动识别角色、地点、物品。实体卡片系统帮你管理复杂的世界观，AI 写作时自动关联上下文。
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative rounded-lg border bg-background p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">AI 副驾驶</h3>
              <p className="text-muted-foreground">
                选中文字即可润色、扩写、缩写。AI 理解你的世界观设定，生成符合故事风格的内容。
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group relative rounded-lg border bg-background p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">可视化时间线</h3>
              <p className="text-muted-foreground">
                为场景添加时间戳，自动生成故事时间线。一目了然地查看剧情发展，避免时间线混乱。
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group relative rounded-lg border bg-background p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">版本历史</h3>
              <p className="text-muted-foreground">
                自动保存版本快照，随时回溯到之前的内容。再也不用担心误删或改坏了。
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group relative rounded-lg border bg-background p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <svg
                  className="h-6 w-6 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold">本地优先</h3>
              <p className="text-muted-foreground">
                编辑操作即时响应，后台异步同步。支持离线编辑，网络恢复后自动同步。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              准备好开始创作了吗？
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              免费注册，立即体验 AI 驱动的写作流程
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  免费开始
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>AI Novel Studio</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built with Next.js, Supabase & AI
          </p>
        </div>
      </footer>
    </div>
  );
}
