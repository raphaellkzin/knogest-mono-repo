"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/features/auth/actions/login.action";

const loginFormSchema = z.object({
  email: z.string().trim().email("Informe um email válido").max(254),
  password: z.string().min(1, "Informe a senha").max(1024),
});

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") || "/home",
    [searchParams],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const parsed = loginFormSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Revise os campos";
      setErrorMessage(message);
      return;
    }

    startTransition(async () => {
      const result = await loginAction({
        ...parsed.data,
        callbackUrl,
      });

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      toast.success("Login realizado");
      router.replace(result.url);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold">
          Email corporativo
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            className="h-11 border-input bg-background pl-10 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
            placeholder="voce@empresa.com.br"
            disabled={isPending}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-semibold">
          Senha
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="h-11 border-input bg-background pl-10 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
            placeholder="Digite sua senha"
            disabled={isPending}
            required
          />
        </div>
      </div>

      {errorMessage && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
        >
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={isPending}
      >
        {isPending && (
          <Loader2
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        )}
        {isPending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
