"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Espace de travail courant (persisté en localStorage). Lu par les hooks de
 * données pour scoper dossiers/projets/tâches à l'espace sélectionné.
 */
interface WorkspaceState {
  currentId: string | null;
  setCurrent: (id: string) => void;
}

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentId: null,
      setCurrent: (id) => set({ currentId: id }),
    }),
    {
      name: "oravec:workspace",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
    },
  ),
);
