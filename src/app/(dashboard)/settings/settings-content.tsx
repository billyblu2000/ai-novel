"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SettingsLayout, AISettings } from "@/components/settings";
import { Loader2 } from "lucide-react";

function SettingsContentInner() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "ai";

  return (
    <SettingsLayout>
      {tab === "ai" && <AISettings />}
      {tab === "profile" && (
        <div className="text-center py-12 text-muted-foreground">
          个人资料设置即将推出
        </div>
      )}
      {tab === "appearance" && (
        <div className="text-center py-12 text-muted-foreground">
          外观主题设置即将推出
        </div>
      )}
    </SettingsLayout>
  );
}

export function SettingsContent() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <SettingsContentInner />
    </Suspense>
  );
}
