'use client';
import { useRef } from 'react';
import { MousePointer2, Square, Circle, Minus, Pencil, Type, Image, Trash2, Trash, Bold, Italic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCanvasStore, type CanvasTool } from '@/store/canvasStore';
import { cn } from '@/lib/utils';

const TOOLS: { id: CanvasTool; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select (V)' },
  { id: 'rect', icon: Square, label: 'Rectangle (R)' },
  { id: 'circle', icon: Circle, label: 'Circle (C)' },
  { id: 'line', icon: Minus, label: 'Line (L)' },
  { id: 'freehand', icon: Pencil, label: 'Freehand Draw (D)' },
  { id: 'text', icon: Type, label: 'Text (T)' },
  { id: 'image', icon: Image, label: 'Insert Image (I)' },
];

const COLORS = ['#1e293b', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'];
const STROKE_WIDTHS = [1, 2, 3, 5, 8];

interface Props {
  onImageUpload: (file: File) => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
}

export function CanvasToolbar({ onImageUpload, onDeleteSelected, onClearAll }: Props) {
  const { activeTool, setTool, strokeColor, setStrokeColor, fillColor, setFillColor, strokeWidth, setStrokeWidth, fontSize, setFontSize } = useCanvasStore();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleToolClick(tool: CanvasTool) {
    if (tool === 'image') {
      fileRef.current?.click();
      return;
    }
    setTool(tool);
  }

  return (
    <TooltipProvider delay={300}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/30 flex-wrap">
        <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0])} />

        {/* Tool buttons */}
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <Tooltip key={id}>
            <TooltipTrigger
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-sm font-medium transition-all',
                activeTool === id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted hover:text-foreground'
              )}
              onClick={() => handleToolClick(id)}
            >
              <Icon className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">{label}</p></TooltipContent>
          </Tooltip>
        ))}

        <Separator orientation="vertical" className="h-5" />

        {/* Stroke color */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              className={cn('h-5 w-5 rounded-full border-2 transition-transform hover:scale-110', strokeColor === c ? 'border-primary scale-110' : 'border-transparent')}
              style={{ backgroundColor: c }}
              onClick={() => setStrokeColor(c)}
              title={`Stroke: ${c}`}
            />
          ))}
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* Stroke width */}
        <div className="flex items-center gap-1">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              className={cn('h-6 w-6 flex items-center justify-center rounded border transition-colors', strokeWidth === w ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted')}
              onClick={() => setStrokeWidth(w)}
              title={`Width: ${w}px`}
            >
              <div className="w-4 rounded-full bg-current" style={{ height: Math.min(w, 4) }} />
            </button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-5" />

        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDeleteSelected} title="Delete selected">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onClearAll} title="Clear all">
          <Trash className="h-3.5 w-3.5" />
        </Button>
      </div>
    </TooltipProvider>
  );
}
