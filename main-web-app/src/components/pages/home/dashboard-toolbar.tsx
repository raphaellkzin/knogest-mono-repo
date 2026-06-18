"use client";

import { Search, Rows3, StretchHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/app.store";

export function DashboardToolbar({
  placeholder = "Buscar máquina, frente ou fornecedor",
}: {
  placeholder?: string;
}) {
  const dashboardDensity = useAppStore((state) => state.dashboardDensity);
  const searchTerm = useAppStore((state) => state.searchTerm);
  const setDashboardDensity = useAppStore((state) => state.setDashboardDensity);
  const setSearchTerm = useAppStore((state) => state.setSearchTerm);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="h-10 border-input bg-card pl-9 placeholder:text-muted-foreground"
          placeholder={placeholder}
        />
      </div>

      <div className="flex rounded-md border border-border bg-card p-1">
        <Button
          type="button"
          size="sm"
          variant={dashboardDensity === "comfortable" ? "default" : "ghost"}
          onClick={() => setDashboardDensity("comfortable")}
        >
          <StretchHorizontal />
          Campo
        </Button>
        <Button
          type="button"
          size="sm"
          variant={dashboardDensity === "compact" ? "default" : "ghost"}
          onClick={() => setDashboardDensity("compact")}
        >
          <Rows3 />
          Compacto
        </Button>
      </div>
    </div>
  );
}
