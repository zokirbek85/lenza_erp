import { create } from 'zustand';

interface SidebarState {
  collapsed: boolean;
  pinned: boolean;
  setCollapsed: (value: boolean) => void;
  setPinned: (value: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  pinned: false,
  setCollapsed: (value) => set({ collapsed: value }),
  setPinned: (value) => set({ pinned: value }),
}));
