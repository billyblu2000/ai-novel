import { create } from "zustand";

interface SidebarState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
}

interface UIState extends SidebarState {
  // Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false,

  // Actions
  toggleLeftSidebar: () =>
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightSidebar: () =>
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
  setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
  setLeftSidebarCollapsed: (collapsed) =>
    set({ leftSidebarCollapsed: collapsed }),
  setRightSidebarCollapsed: (collapsed) =>
    set({ rightSidebarCollapsed: collapsed }),
}));
