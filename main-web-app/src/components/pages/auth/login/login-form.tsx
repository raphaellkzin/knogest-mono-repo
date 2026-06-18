"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Building2,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const loginFormSchema = z.object({
  username: z.string().trim().min(1, "Informe o usuário").max(255),
  password: z.string().min(1, "Informe a senha").max(255),
});

const workspaces = [
  {
    id: "terraplanagem-norte",
    name: "Terraplanagem Norte",
    detail: "3 projetos ativos",
  },
  {
    id: "mineracao-serra-azul",
    name: "Mineração Serra Azul",
    detail: "1 projeto ativo",
  },
  { id: "base-sul", name: "Base Sul", detail: "Somente administração" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0].id);
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") || "/home",
    [searchParams],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const parsed = loginFormSchema.safeParse({
      username: formData.get("username"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Revise os campos";
      setErrorMessage(message);
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        ...parsed.data,
        callbackUrl,
        redirect: false,
      });

      if (!result?.ok) {
        setErrorMessage("Usuário ou senha inválidos");
        return;
      }

      toast.success("Login realizado");
      router.replace(result.url || "/home");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Empresa</legend>
        <input type="hidden" name="workspace" value={selectedWorkspace} />
        <div className="space-y-2">
          {workspaces.map((workspace) => {
            const isSelected = workspace.id === selectedWorkspace;

            return (
              <button
                key={workspace.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  isSelected
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
                aria-pressed={isSelected}
                onClick={() => setSelectedWorkspace(workspace.id)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-card text-primary">
                  <Building2 className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {workspace.name}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                    {workspace.detail}
                  </span>
                </span>
                {isSelected && (
                  <CheckCircle2 className="size-5 shrink-0 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-semibold">
          Usuário
        </label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="username"
            name="username"
            autoComplete="username"
            className="h-11 border-input bg-background pl-10 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
            placeholder="admin@adm.com"
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
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={isPending}
      >
        {isPending && <Loader2 className="animate-spin" />}
        Entrar
      </Button>
    </form>
  );
}
