"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons";
import { toast } from "sonner";
import { Loader2, Github } from "lucide-react";

interface OAuthButtonsProps {
  disabled?: boolean;
  mode?: "login" | "signup";
}

export function OAuthButtons({ disabled, mode = "login" }: OAuthButtonsProps) {
  const supabase = createClient();
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);

  const actionText = mode === "login" ? "登录" : "注册";

  const handleOAuthLogin = async (provider: "github" | "google") => {
    setIsOAuthLoading(provider);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
        setIsOAuthLoading(null);
      }
    } catch {
      toast.error("OAuth 登录失败，请重试");
      setIsOAuthLoading(null);
    }
  };

  const isDisabled = disabled || isOAuthLoading !== null;

  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleOAuthLogin("github")}
        disabled={isDisabled}
      >
        {isOAuthLoading === "github" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Github className="mr-2 h-4 w-4" />
        )}
        使用 GitHub {actionText}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleOAuthLogin("google")}
        disabled={isDisabled}
      >
        {isOAuthLoading === "google" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="mr-2 h-4 w-4" />
        )}
        使用 Google {actionText}
      </Button>
    </div>
  );
}
