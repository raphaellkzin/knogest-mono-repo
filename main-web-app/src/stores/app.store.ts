"use client";

import { create } from "zustand";

type DashboardDensity = "compact" | "comfortable";

interface AppStore {
  dashboardDensity: DashboardDensity;
  sidebarOpen: boolean;
  searchTerm: string;
  setDashboardDensity: (density: DashboardDensity) => void;
  setSearchTerm: (value: string) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  dashboardDensity: "comfortable",
  sidebarOpen: true,
  searchTerm: "",
  setDashboardDensity: (dashboardDensity) => set({ dashboardDensity }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
