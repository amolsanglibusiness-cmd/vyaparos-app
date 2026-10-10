export type BankAccountType = 'Savings' | 'Current';

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: BankAccountType;
  balance: number;
  upiId: string;
  branch: string;
  nickname: string;
  openingDate: string | null;
  status: string;
  showOnInvoice: boolean;
  notes: string;
  createdAt: string;
}

export type SubSavingsType = string;
export type SubSavingsStatus = 'Active' | 'Matured' | 'Closed';

export interface SubSavingsAccount {
  id: string;
  schemeType: SubSavingsType;
  schemeNumber: string;
  linkedBankAccountId: string | null;
  depositAmount: number;
  maturityDate: string | null;
  interestRate: number;
  status: SubSavingsStatus;
  createdAt: string;
}

// Transaction types
export type TransactionType = 'Income' | 'Expense' | 'Savings' | 'Transfer';
export type ExpenseTag = 'Personal / House' | 'Shop / Business';
// Categories are user-manageable; built-in categories are still used as defaults.
export type TxnCategory = string;

export type ExpenseUnit = 'pcs' | 'kg' | 'g' | 'ltr' | 'ml' | 'box' | 'packet' | 'dozen' | 'meter' | 'other';

export interface ExpenseItem {
  id: string;
  name: string;
  category: TxnCategory;
  quantity: number;
  unit: ExpenseUnit;
  rate: number;
  amount: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: TxnCategory;
  description: string;
  date: string;
  tag: ExpenseTag | null;
  sourceAccountId: string;
  destAccountId: string | null;
  isFromGalla: boolean;
  shopName?: string;
  expenseItems?: ExpenseItem[];
  createdAt: string;
  /** True when this row is visible because its bank account is shared across businesses. */
  isShared?: boolean;
  businessName?: string;
}

// Financial Goals
export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  color: string;
}

// Inventory items for low stock alerts
export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  taxRate?: number;
  hsnCode?: string;
  photoUrl: string | null;
  showOnPOS: boolean;
  createdAt: string;
}

// POS Product
export interface POSProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  unit: string;
  stock: number;
  showOnPOS: boolean;
  emoji: string;
  photoUrl?: string | null;
}

// Cart item
export interface CartItem {
  product: POSProduct;
  quantity: number;
  inventoryItemId?: string | null;
  taxRate?: number;
  taxAmount?: number;
  lineAmount?: number;
  discountMode?: 'percentage' | 'fixed';
  discountValue?: number;
}

// POS Invoice / Bill
export interface Invoice {
  id: string;
  invoiceNumber: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Cheque' | 'Credit/Pending';
  date: string;
  createdAt?: string;
  customerName: string;
  customerId?: string | null;
  customerPhone?: string;
  customerAddress?: string;
  taxMode?: 'percentage' | 'fixed';
  taxValue?: number;
  taxAmount?: number;
  discountMode?: 'percentage' | 'fixed';
  discountValue?: number;
  roundOff?: boolean;
  roundOffAmount?: number;
  paymentAccountId?: string | null;
  paymentStatus?: 'Paid' | 'Pending';
  balanceDue?: number;
  terms?: string;
  signatureEnabled?: boolean;
  upiAccountId: string | null;
  transactionId?: string | null;
  stateOfSupply?: string;
  description?: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
}

// Ledger / Udhari
export type LedgerPartyType = 'Customer' | 'Supplier';

export interface LedgerParty {
  id: string;
  name: string;
  type: LedgerPartyType;
  phone: string;
  businessContactNumber?: string;
  email: string;
  address: string;
  photoUrl: string | null;
  upiId: string;
  openingBalance: number;
  gstin?: string;
  notes: string;
  createdAt: string;
}

export type LedgerEntryType = 'Given' | 'Received';

export interface LedgerEntry {
  id: string;
  partyId: string;
  type: LedgerEntryType;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  /** Main transaction created alongside this ledger entry, when applicable. */
  transactionId?: string;
}

// Settings / Business Profile
export interface BusinessProfile {
  ownerName: string;
  businessName: string;
  businessAddress: string;
  phone: string;
  businessContactNumber: string;
  email: string;
  gstin: string;
  signatureUrl: string | null;
  stampUrl: string | null;
  businessLogoUrl: string | null;
  bottomButton1: string;
  bottomButton2: string;
  bottomButton4: string;
  mainBankAccountId: string | null;
}
