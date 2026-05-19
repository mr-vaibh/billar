import type { GstMode, TaxLine } from './gst';

// ─── Block Types ──────────────────────────────────────────────────────────────

export type BlockType =
  | 'company_header'
  | 'party_info'
  | 'supplier_info'
  | 'order_info'
  | 'items_table'
  | 'tax_summary'
  | 'bank_details'
  | 'terms'
  | 'signature'
  | 'canvas_overlay'
  | 'spacer';

export interface BlockBase {
  id: string;
  type: BlockType;
  order: number;
  visible: boolean;
  locked: boolean;
}

// ─── Block Data Types ─────────────────────────────────────────────────────────

export interface CompanyHeaderData {
  companyName: string;
  logo?: string;
  tagline?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  gstin: string;
  pan: string;
  cin?: string;
}

export interface PartyDetails {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  stateCode?: string;
}

export interface PartyInfoData {
  seller: PartyDetails;
  buyer: PartyDetails;
}

export interface SupplierInfoData {
  supplierName: string;
  address: string;
  gstin?: string;
  contact: string;
  email?: string;
  purchaseOrderNumber?: string;
}

export interface OrderInfoData {
  billNumber: string;
  billDate: string;
  dueDate?: string;
  poNumber?: string;
  deliveryDate?: string;
  placeOfSupply: string;
  reverseCharge: boolean;
  eWayBillNumber?: string;
  vehicleNumber?: string;
  transporterName?: string;
  shipmentMode?: string;
}

export interface LineItem {
  id: string;
  slNo: number;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountAmount: number;
  taxableValue: number;
  gstRate: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  cessRate?: number;
  cessAmount?: number;
  totalAmount: number;
}

export interface ItemsTableData {
  items: LineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTaxableValue: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  totalCess?: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
  gstMode: GstMode;
}

export interface TaxSummaryData {
  taxLines: TaxLine[];
  totalTaxableValue: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  totalCess?: number;
  totalTax: number;
  grandTotal: number;
}

export interface BankDetailsData {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: 'savings' | 'current' | 'cc' | 'od';
  branchName: string;
  accountHolderName: string;
  upiId?: string;
  qrCodeImage?: string;
}

export interface TermsData {
  terms: string;
  notes?: string;
  declaration?: string;
}

export interface SignatureData {
  signatoryName: string;
  designation?: string;
  signatureImage?: string;
  date?: string;
  companyStamp?: string;
}

export interface CanvasOverlayData {
  fabricJson: string;
  width: number;
  height: number;
  label?: string;
}

// ─── Discriminated Union ──────────────────────────────────────────────────────

export type Block =
  | (BlockBase & { type: 'company_header'; data: CompanyHeaderData })
  | (BlockBase & { type: 'party_info'; data: PartyInfoData })
  | (BlockBase & { type: 'supplier_info'; data: SupplierInfoData })
  | (BlockBase & { type: 'order_info'; data: OrderInfoData })
  | (BlockBase & { type: 'items_table'; data: ItemsTableData })
  | (BlockBase & { type: 'tax_summary'; data: TaxSummaryData })
  | (BlockBase & { type: 'bank_details'; data: BankDetailsData })
  | (BlockBase & { type: 'terms'; data: TermsData })
  | (BlockBase & { type: 'signature'; data: SignatureData })
  | (BlockBase & { type: 'canvas_overlay'; data: CanvasOverlayData })
  | (BlockBase & { type: 'spacer'; data: { heightPx: number } });

// ─── Bill Meta ────────────────────────────────────────────────────────────────

export type BillStatus = 'draft' | 'finalized' | 'sent' | 'paid' | 'cancelled';
export type BillType =
  | 'invoice'
  | 'proforma'
  | 'credit_note'
  | 'debit_note'
  | 'delivery_challan'
  | 'purchase_order'
  | 'quotation';

export interface BillMeta {
  id: string;
  billNumber: string;
  billType: BillType;
  status: BillStatus;
  companyId?: string;
  templateId?: string;
  duplicatedFromId?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  currency: string;
  financialYear: string;
  buyerName?: string;
  grandTotal?: number;
}

export interface Bill {
  meta: BillMeta;
  blocks: Block[];
  globalCanvasOverlay?: CanvasOverlayData;
  schemaVersion: number;
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

export interface DuplicateFieldMatch {
  field: string;
  value: string;
  matchedBillId: string;
  matchedBillNumber: string;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  score: number;
  matches: DuplicateFieldMatch[];
  matchedBills: Array<{ id: string; billNumber: string; score: number }>;
}
