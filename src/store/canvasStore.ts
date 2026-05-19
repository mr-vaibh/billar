'use client';
import { create } from 'zustand';

export type CanvasTool =
  | 'select'
  | 'rect'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'freehand'
  | 'text'
  | 'image'
  | 'eraser';

interface CanvasState {
  activeTool: CanvasTool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
  opacity: number;
  canvasReady: boolean;

  setTool: (tool: CanvasTool) => void;
  setStrokeColor: (c: string) => void;
  setFillColor: (c: string) => void;
  setStrokeWidth: (w: number) => void;
  setFontSize: (s: number) => void;
  setOpacity: (o: number) => void;
  setCanvasReady: (v: boolean) => void;
}

export const useCanvasStore = create<CanvasState>()((set) => ({
  activeTool: 'select',
  strokeColor: '#1e293b',
  fillColor: 'transparent',
  strokeWidth: 2,
  fontSize: 14,
  opacity: 1,
  canvasReady: false,

  setTool: (tool) => set({ activeTool: tool }),
  setStrokeColor: (c) => set({ strokeColor: c }),
  setFillColor: (c) => set({ fillColor: c }),
  setStrokeWidth: (w) => set({ strokeWidth: w }),
  setFontSize: (s) => set({ fontSize: s }),
  setOpacity: (o) => set({ opacity: o }),
  setCanvasReady: (v) => set({ canvasReady: v }),
}));
