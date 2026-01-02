"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 数据在 5 分钟内被认为是新鲜的
            staleTime: 5 * 60 * 1000,
            // 失败后重试 1 次
            retry: 1,
            // 窗口重新聚焦时不自动重新获取
            refetchOnWindowFocus: false,
          },
          mutations: {
            // mutation 失败后重试 1 次
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
