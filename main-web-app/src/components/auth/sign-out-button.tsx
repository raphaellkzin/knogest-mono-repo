"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { forgetBrowserSessionAction } from "@/features/auth/actions/forget-browser-session.action";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await forgetBrowserSessionAction();
          router.replace("/auth/login");
          router.refresh();
        })
      }
    >
      <LogOut />
      {isPending ? "Saindo…" : "Sair"}
    </Button>
  );
}
