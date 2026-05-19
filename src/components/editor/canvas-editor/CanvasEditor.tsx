'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import type { Canvas as FabricCanvas, TEvent } from 'fabric';
import { useCanvasStore } from '@/store/canvasStore';
import { CanvasToolbar } from './CanvasToolbar';

interface Props {
  fabricJson: string;
  width: number;
  height: number;
  onChange: (json: string) => void;
}

export function CanvasEditor({ fabricJson, width, height, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const { activeTool, strokeColor, fillColor, strokeWidth, fontSize } = useCanvasStore();
  const [isReady, setIsReady] = useState(false);
  const isDrawingShape = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });

  // Initialize fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    let canvas: FabricCanvas;

    async function init() {
      const { Canvas, Rect, Circle, Line, Textbox, FabricImage, Path } = await import('fabric');

      canvas = new Canvas(canvasRef.current!, {
        width,
        height,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
      });

      fabricRef.current = canvas;

      // Load existing JSON
      if (fabricJson && fabricJson !== JSON.stringify({ version: '6.0.0', objects: [] })) {
        try {
          await canvas.loadFromJSON(JSON.parse(fabricJson));
          canvas.renderAll();
        } catch (e) {
          console.warn('Failed to load canvas JSON', e);
        }
      }

      setIsReady(true);

      // Save on object modification
      const saveCanvas = () => {
        const json = JSON.stringify(canvas.toJSON());
        onChange(json);
      };

      canvas.on('object:modified', saveCanvas);
      canvas.on('object:added', saveCanvas);
      canvas.on('object:removed', saveCanvas);

      // Mouse events for shape drawing
      canvas.on('mouse:down', (e: TEvent) => {
        const tool = useCanvasStore.getState().activeTool;
        if (tool === 'select') return;

        const pointer = canvas.getScenePoint(e.e as MouseEvent);
        startPoint.current = { x: pointer.x, y: pointer.y };
        isDrawingShape.current = true;

        const { strokeColor, fillColor, strokeWidth, fontSize } = useCanvasStore.getState();

        if (tool === 'text') {
          const textbox = new Textbox('Text here', {
            left: pointer.x,
            top: pointer.y,
            fontSize,
            fill: strokeColor,
            width: 150,
          });
          canvas.add(textbox);
          canvas.setActiveObject(textbox);
          isDrawingShape.current = false;
          useCanvasStore.getState().setTool('select');
        }
      });

      canvas.on('mouse:up', async (e: TEvent) => {
        const tool = useCanvasStore.getState().activeTool;
        if (!isDrawingShape.current || tool === 'select') return;

        const pointer = canvas.getScenePoint(e.e as MouseEvent);
        const { strokeColor, fillColor, strokeWidth } = useCanvasStore.getState();

        const sx = Math.min(startPoint.current.x, pointer.x);
        const sy = Math.min(startPoint.current.y, pointer.y);
        const w = Math.abs(pointer.x - startPoint.current.x);
        const h = Math.abs(pointer.y - startPoint.current.y);

        let obj = null;

        if (tool === 'rect' && w > 5 && h > 5) {
          obj = new Rect({ left: sx, top: sy, width: w, height: h, fill: fillColor === 'transparent' ? 'transparent' : fillColor, stroke: strokeColor, strokeWidth });
        } else if (tool === 'circle' && w > 5) {
          obj = new Circle({ left: sx, top: sy, radius: Math.max(w, h) / 2, fill: fillColor === 'transparent' ? 'transparent' : fillColor, stroke: strokeColor, strokeWidth });
        } else if (tool === 'line') {
          obj = new Line([startPoint.current.x, startPoint.current.y, pointer.x, pointer.y], { stroke: strokeColor, strokeWidth });
        }

        if (obj) {
          canvas.add(obj);
          canvas.setActiveObject(obj);
        }

        isDrawingShape.current = false;
        useCanvasStore.getState().setTool('select');
        canvas.isDrawingMode = false;
      });
    }

    init();

    return () => {
      fabricRef.current?.dispose();
      fabricRef.current = null;
      setIsReady(false);
    };
  }, []); // eslint-disable-line

  // Update drawing mode based on active tool
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === 'freehand';
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    }

    canvas.selection = activeTool === 'select';
    canvas.defaultCursor = activeTool === 'select' ? 'default' : 'crosshair';
  }, [activeTool, strokeColor, strokeWidth]);

  async function handleImageUpload(file: File) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { FabricImage } = await import('fabric');
    const url = URL.createObjectURL(file);
    const img = await FabricImage.fromURL(url);
    img.scaleToWidth(200);
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
  }

  function deleteSelected() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
    onChange(JSON.stringify(canvas.toJSON()));
  }

  function clearAll() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (!confirm('Clear all drawings?')) return;
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    onChange(JSON.stringify(canvas.toJSON()));
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <CanvasToolbar onImageUpload={handleImageUpload} onDeleteSelected={deleteSelected} onClearAll={clearAll} />
      <div className="overflow-auto">
        <canvas ref={canvasRef} className="block" style={{ maxWidth: '100%' }} />
      </div>
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-muted-foreground">
          Initializing canvas...
        </div>
      )}
    </div>
  );
}
