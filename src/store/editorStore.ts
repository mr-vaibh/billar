'use client';
import { create } from 'zustand';

export type EditorMode = 'blocks' | 'canvas';

interface EditorState {
  mode: EditorMode;
  selectedBlockId: string | null;
  sidebarOpen: boolean;
  blockPaletteOpen: boolean;
  previewMode: boolean;
  zoom: number;

  setMode: (mode: EditorMode) => void;
  selectBlock: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleBlockPalette: () => void;
  setPreviewMode: (v: boolean) => void;
  setZoom: (v: number) => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  mode: 'blocks',
  selectedBlockId: null,
  sidebarOpen: true,
  blockPaletteOpen: false,
  previewMode: false,
  zoom: 1,

  setMode: (mode) => set({ mode }),
  selectBlock: (id) => set({ selectedBlockId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleBlockPalette: () => set((s) => ({ blockPaletteOpen: !s.blockPaletteOpen })),
  setPreviewMode: (v) => set({ previewMode: v }),
  setZoom: (v) => set({ zoom: Math.max(0.5, Math.min(2, v)) }),
}));
