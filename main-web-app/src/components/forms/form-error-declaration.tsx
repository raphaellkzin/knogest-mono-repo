"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export type FormIssue = {
  field?: string;
  location?: string;
  message: string;
};

export function FormErrorDeclaration({
  description = "Revise os pontos abaixo antes de continuar.",
  issues,
  title = "Não foi possível salvar o formulário.",
  className,
}: {
  description?: string;
  issues: FormIssue[];
  title?: string;
  className?: string;
}) {
  if (issues.length === 0) return null;

  return (
    <section
      role="alert"
      aria-live="assertive"
      className={cn(
        "rounded-md border border-destructive/35 bg-destructive/10 px-3 py-3 text-sm text-foreground",
        className,
      )}
    >
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 space-y-2">
          <div>
            <p className="font-bold text-destructive">{title}</p>
            <p className="mt-1 leading-5 text-foreground">{description}</p>
          </div>
          <ul className="grid gap-2">
            {issues.map((issue, index) => (
              <li
                key={`${issue.location ?? "form"}-${issue.field ?? index}-${issue.message}`}
                className="leading-5"
              >
                <span className="font-bold">
                  {[issue.location, issue.field].filter(Boolean).join(" / ") ||
                    "Formulário"}
                  :
                </span>{" "}
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
