import type { Block, BillType, CanvasOverlayData } from './bill';

export interface Template {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  billType: BillType;
  blocks: Block[];
  globalCanvasOverlay?: CanvasOverlayData;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
  tags?: string[];
}
