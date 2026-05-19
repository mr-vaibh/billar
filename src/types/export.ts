export type ExportFormat = 'pdf' | 'word' | 'excel';

export interface ExportOptions {
  format: ExportFormat;
  billId: string;
  includeAnnotations: boolean;
  pageSize: 'A4' | 'A3' | 'letter';
  orientation: 'portrait' | 'landscape';
  colorMode: 'color' | 'grayscale';
}
