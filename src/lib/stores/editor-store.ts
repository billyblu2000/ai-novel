import { create } from "zustand";

interface EditorState {
  // Current active node
  activeNodeId: string | null;
  activeProjectId: string | null;

  // Editor state
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;

  // Actions
  setActiveNode: (nodeId: string | null) => void;
  setActiveProject: (projectId: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSavedAt: (date: Date | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  // Initial state
  activeNodeId: null,
  activeProjectId: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,

  // Actions
  setActiveNode: (nodeId) => set({ activeNodeId: nodeId }),
  setActiveProject: (projectId) => set({ activeProjectId: projectId }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setSaving: (saving) => set({ isSaving: saving }),
  setLastSavedAt: (date) => set({ lastSavedAt: date }),
}));
