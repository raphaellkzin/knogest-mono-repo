"use client";

import { cn } from "@/lib/utils";

export type OperationTabOption<TValue extends string> = {
  value: TValue;
  label: string;
};

export function OperationTabs<TValue extends string>({
  className,
  onValueChange,
  value,
  tabs,
}: {
  className?: string;
  onValueChange: (value: TValue) => void;
  value: TValue;
  tabs: OperationTabOption<TValue>[];
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              "min-h-9 rounded-[min(var(--radius-md),8px)] px-3 text-sm font-semibold text-muted-foreground transition-colors outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
              selected && "bg-background text-foreground ring-1 ring-border",
            )}
            onClick={() => onValueChange(tab.value)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
