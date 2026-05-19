import type {
  Bill, Block, BlockType, BillType, BillStatus,
  CompanyHeaderData, PartyInfoData, SupplierInfoData, OrderInfoData,
  ItemsTableData, TaxSummaryData, BankDetailsData, TermsData, SignatureData, CanvasOverlayData,
} from '@/types/bill';
import { generateId, getCurrentFinancialYear } from '@/lib/idGenerator';

export function createDefaultBlock(type: BlockType, order: number): Block {
  const base = { id: generateId(), type, order, visible: true, locked: false };

  switch (type) {
    case 'company_header':
      return { ...base, type: 'company_header', data: emptyCompanyHeader() };
    case 'party_info':
      return { ...base, type: 'party_info', data: emptyPartyInfo() };
    case 'supplier_info':
      return { ...base, type: 'supplier_info', data: emptySupplierInfo() };
    case 'order_info':
      return { ...base, type: 'order_info', data: emptyOrderInfo() };
    case 'items_table':
      return { ...base, type: 'items_table', data: emptyItemsTable() };
    case 'tax_summary':
      return { ...base, type: 'tax_summary', data: emptyTaxSummary() };
    case 'bank_details':
      return { ...base, type: 'bank_details', data: emptyBankDetails() };
    case 'terms':
      return { ...base, type: 'terms', data: emptyTerms() };
    case 'signature':
      return { ...base, type: 'signature', data: emptySignature() };
    case 'canvas_overlay':
      return { ...base, type: 'canvas_overlay', data: emptyCanvasOverlay() };
    case 'spacer':
      return { ...base, type: 'spacer', data: { heightPx: 32 } };
  }
}

export function createNewBill(type: BillType = 'invoice', templateId?: string): Bill {
  const id = generateId();
  const now = new Date().toISOString();
  const fy = getCurrentFinancialYear();

  const blocks: Block[] = [
    createDefaultBlock('company_header', 0),
    createDefaultBlock('party_info', 1),
    createDefaultBlock('order_info', 2),
    createDefaultBlock('items_table', 3),
    createDefaultBlock('tax_summary', 4),
    createDefaultBlock('bank_details', 5),
    createDefaultBlock('terms', 6),
    createDefaultBlock('signature', 7),
  ];

  return {
    meta: {
      id,
      billNumber: '',
      billType: type,
      status: 'draft' as BillStatus,
      templateId,
      createdAt: now,
      updatedAt: now,
      currency: 'INR',
      financialYear: fy,
      tags: [],
    },
    blocks,
    schemaVersion: 1,
  };
}

function emptyCompanyHeader(): CompanyHeaderData {
  return { companyName: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', gstin: '', pan: '' };
}

function emptyPartyInfo(): PartyInfoData {
  const emptyParty = () => ({ name: '', address: '', city: '', state: '', pincode: '' });
  return { seller: emptyParty(), buyer: emptyParty() };
}

function emptySupplierInfo(): SupplierInfoData {
  return { supplierName: '', address: '', contact: '' };
}

function emptyOrderInfo(): OrderInfoData {
  return {
    billNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    placeOfSupply: '',
    reverseCharge: false,
  };
}

function emptyItemsTable(): ItemsTableData {
  return {
    items: [],
    subtotal: 0,
    totalDiscount: 0,
    totalTaxableValue: 0,
    roundOff: 0,
    grandTotal: 0,
    amountInWords: '',
    gstMode: 'cgst_sgst',
  };
}

function emptyTaxSummary(): TaxSummaryData {
  return { taxLines: [], totalTaxableValue: 0, totalTax: 0, grandTotal: 0 };
}

function emptyBankDetails(): BankDetailsData {
  return { bankName: '', accountNumber: '', ifscCode: '', accountType: 'current', branchName: '', accountHolderName: '' };
}

function emptyTerms(): TermsData {
  return {
    terms: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged on overdue payments.\n3. Subject to local jurisdiction.',
    declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
  };
}

function emptySignature(): SignatureData {
  return { signatoryName: '', designation: 'Authorised Signatory' };
}

function emptyCanvasOverlay(): CanvasOverlayData {
  return {
    fabricJson: JSON.stringify({ version: '6.0.0', objects: [] }),
    width: 794,
    height: 400,
    label: 'Drawing Layer',
  };
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  company_header: 'Company Header',
  party_info: 'From / To (Seller & Buyer)',
  supplier_info: 'Supplier Information',
  order_info: 'Bill / Order Info',
  items_table: 'Items & Pricing',
  tax_summary: 'GST Tax Summary',
  bank_details: 'Bank Details',
  terms: 'Terms & Conditions',
  signature: 'Signature',
  canvas_overlay: 'Drawing / Annotation Layer',
  spacer: 'Spacer',
};

export const BLOCK_ICONS: Record<BlockType, string> = {
  company_header: '🏢',
  party_info: '👥',
  supplier_info: '🚚',
  order_info: '📋',
  items_table: '📦',
  tax_summary: '🧾',
  bank_details: '🏦',
  terms: '📜',
  signature: '✍️',
  canvas_overlay: '🎨',
  spacer: '⬜',
};

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  invoice: 'Tax Invoice',
  proforma: 'Proforma Invoice',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  delivery_challan: 'Delivery Challan',
  purchase_order: 'Purchase Order',
  quotation: 'Quotation',
};

export const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
];
