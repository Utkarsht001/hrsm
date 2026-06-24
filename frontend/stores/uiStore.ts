import { create } from "zustand";

type UiState = {
  isSidebarOpen: boolean;
  isCopilotOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  openCopilot: () => void;
  closeCopilot: () => void;
  toggleCopilot: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  isCopilotOpen: false,
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  openCopilot: () => set({ isCopilotOpen: true }),
  closeCopilot: () => set({ isCopilotOpen: false }),
  toggleCopilot: () => set((s) => ({ isCopilotOpen: !s.isCopilotOpen })),
}));
