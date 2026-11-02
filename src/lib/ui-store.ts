"use client";

import { create } from "zustand";
import { todayISO } from "./format";

interface UiState {
  editorOpen: boolean;
  editorDate: string;
  openEditor: (date?: string) => void;
  closeEditor: () => void;
  unlockedQueue: string[];
  enqueueUnlocks: (ids: string[]) => void;
  shiftUnlock: () => void;
  clearUnlocks: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  editorOpen: false,
  editorDate: todayISO(),
  openEditor: (date) => set({ editorOpen: true, editorDate: date ?? todayISO() }),
  closeEditor: () => set({ editorOpen: false }),
  unlockedQueue: [],
  enqueueUnlocks: (ids) =>
    set((state) => ({
      unlockedQueue: [...state.unlockedQueue, ...ids.filter((id) => !state.unlockedQueue.includes(id))],
    })),
  shiftUnlock: () => set((state) => ({ unlockedQueue: state.unlockedQueue.slice(1) })),
  clearUnlocks: () => set({ unlockedQueue: [] }),
}));
