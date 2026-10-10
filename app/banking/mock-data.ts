import type { BankAccount, SubSavingsAccount, Transaction, FinancialGoal, InventoryItem, POSProduct, LedgerParty, LedgerEntry } from './types';

export const GALLA_ID = 'galla-cashbox';
export const CASH_IN_HAND_ID = 'cash-in-hand';

export const mockBankAccounts: BankAccount[] = [
  {
    id: 'ba-1',
    bankName: 'State Bank of India',
    accountHolderName: 'Rajesh Sharma',
    accountNumber: '37291048563',
    ifscCode: 'SBIN0001234',
    accountType: 'Savings',
    balance: 185750,
    upiId: 'rajeshsharma@sbi',
    branch: '',
    nickname: '',
    openingDate: null,
    status: 'Active',
    showOnInvoice: true,
    notes: '',
    createdAt: '2025-01-15T10:30:00Z',
  },
  {
    id: 'ba-2',
    bankName: 'HDFC Bank',
    accountHolderName: 'Rajesh Sharma',
    accountNumber: '50100482917',
    ifscCode: 'HDFC0000456',
    accountType: 'Current',
    balance: 432000,
    upiId: 'rajesh.hdfc@hdfcbank',
    branch: '',
    nickname: '',
    openingDate: null,
    status: 'Active',
    showOnInvoice: true,
    notes: '',
    createdAt: '2025-03-22T14:15:00Z',
  },
];

export const mockSubSavings: SubSavingsAccount[] = [
  {
    id: 'ss-1',
    schemeType: 'Daily Pigmy',
    schemeNumber: 'DP-2025-0451',
    linkedBankAccountId: 'ba-1',
    depositAmount: 12000,
    maturityDate: null,
    interestRate: 4.5,
    status: 'Active',
    createdAt: '2025-02-01T09:00:00Z',
  },
  {
    id: 'ss-2',
    schemeType: 'RD',
    schemeNumber: 'RD-2025-0118',
    linkedBankAccountId: 'ba-1',
    depositAmount: 60000,
    maturityDate: '2027-02-28',
    interestRate: 6.8,
    status: 'Active',
    createdAt: '2025-02-28T09:00:00Z',
  },
  {
    id: 'ss-3',
    schemeType: 'FD',
    schemeNumber: 'FD-2024-9923',
    linkedBankAccountId: 'ba-2',
    depositAmount: 250000,
    maturityDate: '2026-09-18',
    interestRate: 7.1,
    status: 'Active',
    createdAt: '2024-09-18T09:00:00Z',
  },
  {
    id: 'ss-4',
    schemeType: 'Gold Savings',
    schemeNumber: 'GS-2025-0034',
    linkedBankAccountId: null,
    depositAmount: 85000,
    maturityDate: null,
    interestRate: 0,
    status: 'Active',
    createdAt: '2025-04-10T09:00:00Z',
  },
];

export const mockGallaBalance = 47500;

export const mockTransactions: Transaction[] = [
  {
    id: 'txn-1',
    type: 'Income',
    amount: 25000,
    category: 'Business Revenue',
    description: 'Daily shop sales',
    date: '2025-09-16',
    tag: 'Shop / Business',
    sourceAccountId: GALLA_ID,
    destAccountId: null,
    isFromGalla: false,
    createdAt: '2025-09-16T18:00:00Z',
  },
  {
    id: 'txn-2',
    type: 'Expense',
    amount: 50,
    category: 'Supplies',
    description: 'Milk for shop',
    date: '2025-09-17',
    tag: 'Shop / Business',
    sourceAccountId: GALLA_ID,
    destAccountId: null,
    isFromGalla: true,
    createdAt: '2025-09-17T08:30:00Z',
  },
  {
    id: 'txn-3',
    type: 'Transfer',
    amount: 15000,
    category: 'Other',
    description: 'Galla to SBI deposit',
    date: '2025-09-17',
    tag: null,
    sourceAccountId: GALLA_ID,
    destAccountId: 'ba-1',
    isFromGalla: true,
    createdAt: '2025-09-17T12:00:00Z',
  },
  {
    id: 'txn-4',
    type: 'Expense',
    amount: 3200,
    category: 'Rent',
    description: 'Monthly house rent',
    date: '2025-09-15',
    tag: 'Personal / House',
    sourceAccountId: 'ba-1',
    destAccountId: null,
    isFromGalla: false,
    createdAt: '2025-09-15T10:00:00Z',
  },
  {
    id: 'txn-5',
    type: 'Income',
    amount: 50000,
    category: 'Salary',
    description: 'Monthly salary credited',
    date: '2025-09-01',
    tag: 'Personal / House',
    sourceAccountId: 'ba-1',
    destAccountId: null,
    isFromGalla: false,
    createdAt: '2025-09-01T09:00:00Z',
  },
  {
    id: 'txn-6',
    type: 'Transfer',
    amount: 30000,
    category: 'Other',
    description: 'SBI to HDFC transfer',
    date: '2025-09-10',
    tag: null,
    sourceAccountId: 'ba-1',
    destAccountId: 'ba-2',
    isFromGalla: false,
    createdAt: '2025-09-10T14:00:00Z',
  },
  {
    id: 'txn-7',
    type: 'Expense',
    amount: 1200,
    category: 'Utilities',
    description: 'Electricity bill',
    date: '2025-09-12',
    tag: 'Shop / Business',
    sourceAccountId: 'ba-2',
    destAccountId: null,
    isFromGalla: false,
    createdAt: '2025-09-12T11:00:00Z',
  },
];

export function generateUpiId(holderName: string, bankName: string): string {
  const cleanName = holderName
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/\s+/g, '');
  const bankPrefix = bankName
    .toLowerCase()
    .replace(/bank of india|bank/g, '')
    .replace(/[^a-z]/g, '')
    .slice(0, 6);
  return `${cleanName.slice(0, 12)}@${bankPrefix || 'upi'}`;
}

/**
 * Supabase primary keys are UUIDs. Keep this helper name for the existing
 * callers, but always return a real UUID so newly-created records can be
 * inserted into every Supabase table without a UUID parsing error.
 */
export function generateId(_prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older runtimes. This is still UUID-shaped.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export const mockGoals: FinancialGoal[] = [
  {
    id: 'goal-1',
    title: 'New Shop Expansion',
    targetAmount: 500000,
    savedAmount: 185000,
    deadline: '2026-06-30',
    color: 'from-sky-500 to-blue-600',
  },
  {
    id: 'goal-2',
    title: 'Emergency Fund',
    targetAmount: 200000,
    savedAmount: 142000,
    deadline: '2025-12-31',
    color: 'from-teal-500 to-emerald-600',
  },
  {
    id: 'goal-3',
    title: 'Family Vacation',
    targetAmount: 80000,
    savedAmount: 25000,
    deadline: '2026-03-15',
    color: 'from-amber-500 to-orange-600',
  },
];

export const mockInventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Basmati Rice 1kg', stock: 20, minStock: 5, unit: 'pack', category: 'Grains', purchasePrice: 72, sellingPrice: 85, photoUrl: null, showOnPOS: true, createdAt: '2025-06-01T09:00:00Z' },
  { id: 'inv-2', name: 'Cooking Oil 1L', stock: 15, minStock: 8, unit: 'btl', category: 'Essentials', purchasePrice: 118, sellingPrice: 140, photoUrl: null, showOnPOS: true, createdAt: '2025-06-05T09:00:00Z' },
  { id: 'inv-3', name: 'Sugar 1kg', stock: 30, minStock: 5, unit: 'pack', category: 'Essentials', purchasePrice: 38, sellingPrice: 45, photoUrl: null, showOnPOS: true, createdAt: '2025-06-10T09:00:00Z' },
  { id: 'inv-4', name: 'Tea Powder 500g', stock: 12, minStock: 4, unit: 'pack', category: 'Beverages', purchasePrice: 95, sellingPrice: 120, photoUrl: null, showOnPOS: true, createdAt: '2025-07-01T09:00:00Z' },
  { id: 'inv-5', name: 'Wheat Flour 10kg', stock: 8, minStock: 3, unit: 'bag', category: 'Grains', purchasePrice: 320, sellingPrice: 380, photoUrl: null, showOnPOS: true, createdAt: '2025-07-15T09:00:00Z' },
  { id: 'inv-6', name: 'Detergent 1kg', stock: 10, minStock: 6, unit: 'pack', category: 'Household', purchasePrice: 78, sellingPrice: 95, photoUrl: null, showOnPOS: true, createdAt: '2025-08-01T09:00:00Z' },
  { id: 'inv-7', name: 'Toor Dal 1kg', stock: 18, minStock: 5, unit: 'pack', category: 'Pulses', purchasePrice: 92, sellingPrice: 110, photoUrl: null, showOnPOS: true, createdAt: '2025-08-10T09:00:00Z' },
  { id: 'inv-8', name: 'Biscuits Pack', stock: 50, minStock: 10, unit: 'pack', category: 'Snacks', purchasePrice: 24, sellingPrice: 30, photoUrl: null, showOnPOS: true, createdAt: '2025-08-15T09:00:00Z' },
  { id: 'inv-9', name: 'Milk 500ml', stock: 25, minStock: 10, unit: 'pouch', category: 'Dairy', purchasePrice: 22, sellingPrice: 28, photoUrl: null, showOnPOS: true, createdAt: '2025-09-01T09:00:00Z' },
  { id: 'inv-10', name: 'Bread Loaf', stock: 15, minStock: 5, unit: 'loaf', category: 'Bakery', purchasePrice: 32, sellingPrice: 40, photoUrl: null, showOnPOS: true, createdAt: '2025-09-05T09:00:00Z' },
  { id: 'inv-11', name: 'Shampoo 200ml', stock: 14, minStock: 5, unit: 'btl', category: 'Personal Care', purchasePrice: 68, sellingPrice: 85, photoUrl: null, showOnPOS: false, createdAt: '2025-09-10T09:00:00Z' },
  { id: 'inv-12', name: 'Hand Wash 250ml', stock: 9, minStock: 4, unit: 'btl', category: 'Personal Care', purchasePrice: 50, sellingPrice: 65, photoUrl: null, showOnPOS: false, createdAt: '2025-09-12T09:00:00Z' },
];

export const mockNetWorthHistory = [
  { month: 'Apr', value: 712000 },
  { month: 'May', value: 738000 },
  { month: 'Jun', value: 755000 },
  { month: 'Jul', value: 782000 },
  { month: 'Aug', value: 810000 },
  { month: 'Sep', value: 882250 },
];

export const mockPOSProducts: POSProduct[] = [
  { id: 'p-1', name: 'Basmati Rice 1kg', price: 85, category: 'Grains', unit: 'pack', stock: 20, showOnPOS: true, emoji: '🍚' },
  { id: 'p-2', name: 'Cooking Oil 1L', price: 140, category: 'Essentials', unit: 'btl', stock: 15, showOnPOS: true, emoji: '🫒' },
  { id: 'p-3', name: 'Sugar 1kg', price: 45, category: 'Essentials', unit: 'pack', stock: 30, showOnPOS: true, emoji: '🧂' },
  { id: 'p-4', name: 'Tea Powder 500g', price: 120, category: 'Beverages', unit: 'pack', stock: 12, showOnPOS: true, emoji: '🍵' },
  { id: 'p-5', name: 'Wheat Flour 10kg', price: 380, category: 'Grains', unit: 'bag', stock: 8, showOnPOS: true, emoji: '🌾' },
  { id: 'p-6', name: 'Detergent 1kg', price: 95, category: 'Household', unit: 'pack', stock: 10, showOnPOS: true, emoji: '🧺' },
  { id: 'p-7', name: 'Toor Dal 1kg', price: 110, category: 'Pulses', unit: 'pack', stock: 18, showOnPOS: true, emoji: '🫘' },
  { id: 'p-8', name: 'Biscuits Pack', price: 30, category: 'Snacks', unit: 'pack', stock: 50, showOnPOS: true, emoji: '🍪' },
  { id: 'p-9', name: 'Milk 500ml', price: 28, category: 'Dairy', unit: 'pouch', stock: 25, showOnPOS: true, emoji: '🥛' },
  { id: 'p-10', name: 'Bread Loaf', price: 40, category: 'Bakery', unit: 'loaf', stock: 15, showOnPOS: true, emoji: '🍞' },
  { id: 'p-11', name: 'Shampoo 200ml', price: 85, category: 'Personal Care', unit: 'btl', stock: 14, showOnPOS: false, emoji: '🧴' },
  { id: 'p-12', name: 'Hand Wash 250ml', price: 65, category: 'Personal Care', unit: 'btl', stock: 9, showOnPOS: false, emoji: '🧼' },
];

export const mockLedgerParties: LedgerParty[] = [
  {
    id: 'lp-1',
    name: 'Amit Patil',
    type: 'Customer',
    phone: '9876543210',
    email: 'amit.patil@gmail.com',
    address: '12 Ganesh Colony, Kothrud, Pune',
    photoUrl: null,
    upiId: 'amitpatil@paytm',
    openingBalance: 0,
    notes: 'Regular customer, monthly credit',
    createdAt: '2025-06-01T09:00:00Z',
  },
  {
    id: 'lp-2',
    name: 'Sunita Deshmukh',
    type: 'Customer',
    phone: '9822345678',
    email: 'sunita.d@gmail.com',
    address: '45 Shivaji Nagar, Pimpri, Pune',
    photoUrl: null,
    upiId: 'sunitadeshmukh@ybl',
    openingBalance: 0,
    notes: 'Weekly grocery credit',
    createdAt: '2025-07-15T09:00:00Z',
  },
  {
    id: 'lp-3',
    name: 'Mahesh Traders',
    type: 'Supplier',
    phone: '9970012345',
    email: 'orders@maheshtraders.com',
    address: 'Market Yard, Gultekdi, Pune',
    photoUrl: null,
    upiId: 'maheshtraders@hdfcbank',
    openingBalance: 0,
    notes: 'Wholesale grain supplier',
    createdAt: '2025-05-10T09:00:00Z',
  },
  {
    id: 'lp-4',
    name: 'Ravi Kumar',
    type: 'Customer',
    phone: '9657890123',
    email: 'ravi.kumar@gmail.com',
    address: '78 FC Road, Shivajinagar, Pune',
    photoUrl: null,
    upiId: 'ravikumar@oksbi',
    openingBalance: 0,
    notes: 'Larger credit purchases',
    createdAt: '2025-08-01T09:00:00Z',
  },
];

export const mockLedgerEntries: LedgerEntry[] = [
  { id: 'le-1', partyId: 'lp-1', type: 'Given', amount: 2500, description: 'Monthly grocery credit', date: '2025-09-01', createdAt: '2025-09-01T10:00:00Z' },
  { id: 'le-2', partyId: 'lp-1', type: 'Received', amount: 1000, description: 'Partial payment via UPI', date: '2025-09-10', createdAt: '2025-09-10T15:00:00Z' },
  { id: 'le-3', partyId: 'lp-1', type: 'Given', amount: 800, description: 'Extra items on credit', date: '2025-09-15', createdAt: '2025-09-15T11:00:00Z' },
  { id: 'le-4', partyId: 'lp-2', type: 'Given', amount: 1500, description: 'Weekly grocery', date: '2025-09-05', createdAt: '2025-09-05T12:00:00Z' },
  { id: 'le-5', partyId: 'lp-2', type: 'Received', amount: 1500, description: 'Full payment in cash', date: '2025-09-12', createdAt: '2025-09-12T14:00:00Z' },
  { id: 'le-6', partyId: 'lp-3', type: 'Received', amount: 12000, description: 'Grain stock purchase (we owe)', date: '2025-09-08', createdAt: '2025-09-08T09:00:00Z' },
  { id: 'le-7', partyId: 'lp-3', type: 'Given', amount: 5000, description: 'Payment to supplier', date: '2025-09-14', createdAt: '2025-09-14T16:00:00Z' },
  { id: 'le-8', partyId: 'lp-4', type: 'Given', amount: 4200, description: 'Bulk purchase on credit', date: '2025-09-16', createdAt: '2025-09-16T13:00:00Z' },
  { id: 'le-9', partyId: 'lp-4', type: 'Received', amount: 2000, description: 'Partial payment', date: '2025-09-18', createdAt: '2025-09-18T10:00:00Z' },
];
