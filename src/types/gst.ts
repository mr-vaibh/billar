export type GstMode = 'cgst_sgst' | 'igst';

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRateValue = (typeof GST_RATES)[number];

export interface TaxBreakdown {
  mode: GstMode;
  taxableAmount: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  cessRate?: number;
  cessAmount?: number;
  totalTax: number;
}

export interface TaxLine {
  hsnCode: string;
  description: string;
  taxableValue: number;
  breakdown: TaxBreakdown;
}
