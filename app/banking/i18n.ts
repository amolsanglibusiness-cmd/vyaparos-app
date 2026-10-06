export type Language = 'en' | 'mr';

export interface Translations {
  appName: string;
  // Nav
  navDashboard: string;
  navBanking: string;
  navTransactions: string;
  navPos: string;
  navInvoice: string;
  navSalesHistory: string;
  navAssistant: string;
  navMenu: string;
  // Header
  darkMode: string;
  lightMode: string;
  // Greeting
  goodMorning: string;
  goodAfternoon: string;
  goodEvening: string;
  // Date filter
  today: string;
  yesterday: string;
  thisWeek: string;
  thisMonth: string;
  customRange: string;
  // Net worth
  netWorth: string;
  netWorthSubtitle: string;
  // Metrics
  cashGalla: string;
  cashInHand: string;
  totalBalance: string;
  totalExpenses: string;
  totalSavings: string;
  bankBalance: string;
  // Glass grid
  todaySale: string;
  todayExpenses: string;
  monthSale: string;
  netProfitMonth: string;
  // Goals
  financialGoals: string;
  targetAmount: string;
  savedAmount: string;
  remaining: string;
  addGoal: string;
  // Quick actions
  quickActions: string;
  quickExpense: string;
  addSale: string;
  quickTransfer: string;
  // Widgets
  recentTransactions: string;
  viewAll: string;
  lowStockAlerts: string;
  noAlerts: string;
  // Common
  income: string;
  expense: string;
  transfer: string;
  description: string;
  amount: string;
  date: string;
  category: string;
  addTransaction: string;
  cancel: string;
  save: string;
  edit: string;
  delete: string;
  search: string;
  welcome: string;
  // POS
  posBilling: string;
  posSubtitle: string;
  searchProducts: string;
  allCategories: string;
  cart: string;
  cartEmpty: string;
  cartEmptyDesc: string;
  subtotal: string;
  discount: string;
  total: string;
  checkout: string;
  clearCart: string;
  paymentMethod: string;
  cash: string;
  upi: string;
  card: string;
  customerName: string;
  customerNamePlaceholder: string;
  generateBill: string;
  receipt: string;
  print: string;
  print2inch: string;
  print3inch: string;
  closeReceipt: string;
  newBill: string;
  invoiceNo: string;
  item: string;
  qty: string;
  rate: string;
  amt: string;
  thankYou: string;
  authorizedSignature: string;
  stamp: string;
  scanToPay: string;
  paidVia: string;
  showPOSOnly: string;
  allProducts: string;
  outOfStock: string;
  inStock: string;
  billSummary: string;
  itemsInCart: string;
  savedBills: string;
  savedBillsDesc: string;
  billSearchPlaceholder: string;
  noSavedBills: string;
  walkInCustomer: string;
  itemsLabel: string;
  billEditMode: string;
  noProductsFound: string;
  // Ledger / Udhari
  navLedger: string;
  navCash: string;
  ledgerTitle: string;
  ledgerSubtitle: string;
  customers: string;
  suppliers: string;
  allParties: string;
  addParty: string;
  importParties: string;
  fromYourContacts: string;
  searchContacts: string;
  noContactsFound: string;
  contactsPermissionDenied: string;
  contactAccessRequired: string;
  partyGstin: string;
  saveParty: string;
  saveAndNew: string;
  addNewParty: string;
  createInvoiceSale: string;
  addBankAccount: string;
  invoicePage: string;
  share: string;
  editParty: string;
  deleteParty: string;
  partyName: string;
  partyType: string;
  customer: string;
  supplier: string;
  phone: string;
  email: string;
  address: string;
  upiId: string;
  notes: string;
  openingBalance: string;
  udhariBalance: string;
  balanceGiven: string;
  balanceReceived: string;
  settled: string;
  addEntry: string;
  entryType: string;
  given: string;
  received: string;
  entryAmount: string;
  entryDescription: string;
  entryDate: string;
  ledgerHistory: string;
  whatsappReminder: string;
  whatsappReminderMsg: string;
  callNow: string;
  noParties: string;
  noPartiesDesc: string;
  noEntries: string;
  searchParties: string;
  totalReceivable: string;
  totalPayable: string;
  profilePhoto: string;
  contactDetails: string;
  paymentLink: string;
  cashEntry: string;
  addCashEntry: string;
  editCashEntry: string;
  cashEntryDesc: string;
  dukanGalla: string;
  cashBox: string;
  physicalCash: string;
  increase: string;
  decrease: string;
  reasonNote: string;
  openingCashPlaceholder: string;
  saveEntry: string;
  cashTransactions: string;
  noCashEntries: string;
  noCashEntriesDesc: string;
  manageFromSource: string;
  openTransactions: string;
  // Inventory
  navInventory: string;
  inventoryTitle: string;
  inventorySubtitle: string;
  addItem: string;
  editItem: string;
  itemName: string;
  unit: string;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: string;
  minStock: string;
  showOnPOS: string;
  showOnPOSYes: string;
  showOnPOSNo: string;
  itemPhoto: string;
  addPhoto: string;
  noItems: string;
  noItemsDesc: string;
  searchItems: string;
  totalItems: string;
  lowStockCount: string;
  totalStockValue: string;
  stockLevel: string;
  good: string;
  low: string;
  critical: string;
  out: string;
  wellStocked: string;
  profitMargin: string;
  actions: string;
  confirmDelete: string;
  confirmDeleteDesc: string;
  // Banking & Transactions
  bankingTitle: string;
  bankingSubTitle: string;
  bankMainAccounts: string;
  bankSavingsInvestments: string;
  bankMainTab: string;
  bankSubTab: string;
  bankAccountsLabel: string;
  bankAccountConnected: string;
  bankAccountsConnected: string;
  bankNoAccounts: string;
  bankAddFirst: string;
  bankAddAccount: string;
  bankSubAccountsLabel: string;
  bankSchemeTracked: string;
  bankSchemesTracked: string;
  bankNoSubSavings: string;
  bankAddSubDesc: string;
  bankAddSub: string;
  transactionManagement: string;
  transactionSubtitle: string;
  netPL: string;
  entries: string;
  gallaCashBox: string;
  currentCashOnHand: string;
  expenseBreakdownTitle: string;
  personalVsBusiness: string;
  noFilteredTransactions: string;
  useAddTransaction: string;
  addBankTitle: string;
  addBankDesc: string;
  bankNameLabel: string;
  holderNameLabel: string;
  accountNumberLabel: string;
  ifscLabel: string;
  optionalLabel: string;
  accountTypeLabel: string;
  openingBalanceLabel: string;
  addAccountBtn: string;
  addSubTitle: string;
  addSubDesc: string;
  schemeTypeLabel: string;
  schemeNumberLabel: string;
  linkedMainAccountLabel: string;
  noLinkedAccountLabel: string;
  dailyAmountLabel: string;
  initialDepositLabel: string;
  interestRateLabel: string;
  maturityDateLabel: string;
  addSchemeBtn: string;
  addTransactionDesc: string;
  amountRupeeLabel: string;
  descriptionNoteLabel: string;
  tagPersonalBusiness: string;
  depositToLabel: string;
  paidFromLabel: string;
  fromLabel: string;
  toLabel: string;
  selectDestination: string;
  gallaTransferHint: string;
  gallaExpenseHint: string;
  editTransactionTitle: string;
  updateTransactionDesc: string;
  copyUpi: string;
  showQr: string;
  copied: string;
  scanQrHint: string;
  editBankTitle: string;
  updateBankDesc: string;
  noDeleteBankWarning: string;
  saveChangesBtn: string;
  noTransactions: string;
  addEntryHint: string;
  schemeLabel: string;
  linkedBankLabel: string;
  depositLabel: string;
  interestLabel: string;
  statusLabel: string;
  allLabel: string;
  personalLabel: string;
  businessLabel: string;
  tagLabel: string;
  savingsLabel: string;
  currentLabel: string;
  categoryLabel: string;
  // Settings
  navSettings: string;
  settingsTitle: string;
  businessLogo: string;
  businessLogoDesc: string;
  uploadBusinessLogo: string;
  removeBusinessLogo: string;
  mobileBottomBar: string;
  mobileBottomBarDesc: string;
  button1: string;
  button2: string;
  button4: string;
  settingsSubtitle: string;
  profileSection: string;
  businessSection: string;
  brandingSection: string;
  ownerName: string;
  businessName: string;
  businessAddress: string;
  gstin: string;
  signatureUrl: string;
  stampUrl: string;
  uploadSignature: string;
  uploadStamp: string;
  removeSignature: string;
  removeStamp: string;
  signaturePreview: string;
  stampPreview: string;
  settingsSaved: string;
  settingsSavedDesc: string;
  saveChanges: string;
  resetToDefault: string;
  resetConfirm: string;
  resetConfirmDesc: string;
  ownerInfo: string;
  ownerInfoDesc: string;
  businessInfo: string;
  businessInfoDesc: string;
  receiptBranding: string;
  receiptBrandingDesc: string;
  personalInfo: string;
  personalInfoDesc: string;
  // Reports & Analytics
  navReports: string;
  reportsTitle: string;
  reportsSubtitle: string;
  dayBook: string;
  profitLoss: string;
  expenseBreakup: string;
  analytics: string;
  exportCsv: string;
  exportExcel: string;
  exportPdf: string;
  totalIncome: string;
  totalExpense: string;
  netProfit: string;
  netLoss: string;
  closingBalance: string;
  txnCount: string;
  revenueByCategory: string;
  expenseByCategory: string;
  dailyTrend: string;
  topIncome: string;
  topExpense: string;
  noData: string;
  noDataDesc: string;
  slNo: string;
  particulars: string;
  type: string;
  exportReport: string;
  revenue: string;
  profit: string;
  loss: string;
  daily: string;
  weekly: string;
  monthly: string;
  startDate: string;
  endDate: string;
  applyRange: string;
  addFinancialGoal: string;
  goalTitle: string;
  savedSoFar: string;
  deadline: string;
  appSecurity: string;
  appSecurityDesc: string;
  appLockPin: string;
  pinDigitsDesc: string;
  fingerprintLock: string;
  biometricDesc: string;
  unlockWithPin: string;
  unlockWithFingerprint: string;
  shopOwner: string;
  remove: string;
  cashManagement: string;
  cashPageTitle: string;
  cashPageDesc: string;
  mainShopCashBox: string;
  separatePhysicalCash: string;
  cashPageEntriesDesc: string;
  cashPageAddEntry: string;
}

const en: Translations = {
  appName: 'FinanceHub',
  navDashboard: 'Home',
  navBanking: 'Bank & Savings',
  navTransactions: 'Transactions',
  navPos: 'POS Billing',
  navInvoice: 'Invoice',
  navSalesHistory: 'Sales History',
  navAssistant: 'AI Assistant',
  navMenu: 'Menu',
  darkMode: 'Dark Mode',
  lightMode: 'Light Mode',
  goodMorning: 'Good Morning',
  goodAfternoon: 'Good Afternoon',
  goodEvening: 'Good Evening',
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This Week',
  thisMonth: 'This Month',
  customRange: 'Custom Range',
  netWorth: 'Net Worth',
  netWorthSubtitle: 'Total value of all accounts & savings',
  cashGalla: 'Cash (Dukan Galla)',
  cashInHand: 'Cash in Hand',
  totalBalance: 'Total Balance',
  totalExpenses: 'Total Expenses',
  totalSavings: 'Total Savings',
  bankBalance: 'Bank Balance',
  todaySale: "Today's Sale",
  todayExpenses: "Today's Expenses",
  monthSale: 'This Month Sale',
  netProfitMonth: 'Net Profit (Month)',
  financialGoals: 'Financial Goals',
  targetAmount: 'Target',
  savedAmount: 'Saved',
  remaining: 'Remaining',
  addGoal: 'Add Goal',
  quickActions: 'Quick Actions',
  quickExpense: 'Quick Expense',
  addSale: 'Add Sale',
  quickTransfer: 'Quick Transfer',
  recentTransactions: 'Recent Transactions',
  viewAll: 'View All',
  lowStockAlerts: 'Low Stock Alerts',
  noAlerts: 'All items well stocked',
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
  description: 'Description',
  amount: 'Amount',
  date: 'Date',
  category: 'Category',
  addTransaction: 'Add Transaction',
  cancel: 'Cancel',
  save: 'Save',
  edit: 'Edit',
  delete: 'Delete',
  search: 'Search',
  welcome: 'Welcome back',
  // POS
  posBilling: 'POS Billing',
  posSubtitle: 'Quick billing and checkout for your shop',
  searchProducts: 'Search products...',
  allCategories: 'All Categories',
  cart: 'Cart',
  cartEmpty: 'Cart is empty',
  cartEmptyDesc: 'Click products to add them to the cart',
  subtotal: 'Subtotal',
  discount: 'Discount',
  total: 'Total',
  checkout: 'Checkout',
  clearCart: 'Clear',
  paymentMethod: 'Payment Method',
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  customerName: 'Customer Name',
  customerNamePlaceholder: 'Walk-in customer',
  generateBill: 'Generate Bill',
  receipt: 'Receipt',
  print: 'Print',
  print2inch: '2-inch Thermal',
  print3inch: '3-inch Thermal',
  closeReceipt: 'Close',
  newBill: 'New Bill',
  invoiceNo: 'Invoice No.',
  item: 'Item',
  qty: 'Qty',
  rate: 'Rate',
  amt: 'Amt',
  thankYou: 'Thank you! Visit again.',
  authorizedSignature: 'Authorized Signature',
  stamp: 'Stamp',
  scanToPay: 'Scan to Pay',
  paidVia: 'Paid via',
  showPOSOnly: 'POS Items',
  allProducts: 'All Items',
  outOfStock: 'Out of Stock',
  inStock: 'in stock',
  billSummary: 'Bill Summary',
  itemsInCart: 'items in cart',
  savedBills: 'Saved Bills',
  savedBillsDesc: 'Search bills by Bill No. or Customer Name and edit or delete them.',
  billSearchPlaceholder: 'Bill No. / Customer Name',
  noSavedBills: 'No saved bills found.',
  walkInCustomer: 'Walk-in Customer',
  itemsLabel: 'items',
  billEditMode: 'Bill Edit Mode',
  noProductsFound: 'No products found',
  // Ledger / Udhari
  navLedger: 'Ledger',
  navCash: 'Cash',
  ledgerTitle: 'Customers & Suppliers',
  ledgerSubtitle: 'Track Udhari balances, send payment reminders, and manage contact profiles',
  customers: 'Customers',
  suppliers: 'Suppliers',
  allParties: 'All',
  addParty: 'Add Party',
  importParties: 'Import Parties',
  fromYourContacts: 'from your contacts',
  searchContacts: 'Search contacts by name or mobile',
  noContactsFound: 'No contacts found',
  contactsPermissionDenied: 'Contacts permission was denied.',
  contactAccessRequired: 'Allow Contacts access to import parties.',
  partyGstin: 'GSTIN',
  saveParty: 'Save Party',
  saveAndNew: 'Save & New',
  addNewParty: 'Add New Party',
  createInvoiceSale: 'Create Invoice / Sale',
  addBankAccount: 'Add Bank / Account',
  invoicePage: 'Invoice Page',
  share: 'Share',
  editParty: 'Edit Party',
  deleteParty: 'Delete Party',
  partyName: 'Name',
  partyType: 'Type',
  customer: 'Customer',
  supplier: 'Supplier',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',
  upiId: 'UPI ID',
  notes: 'Notes',
  openingBalance: 'Opening Balance',
  udhariBalance: 'Udhari Balance',
  balanceGiven: 'You Gave',
  balanceReceived: 'You Received',
  settled: 'Settled',
  addEntry: 'Add Entry',
  entryType: 'Entry Type',
  given: 'Given',
  received: 'Received',
  entryAmount: 'Amount',
  entryDescription: 'Description',
  entryDate: 'Date',
  ledgerHistory: 'Ledger History',
  whatsappReminder: 'WhatsApp Reminder',
  whatsappReminderMsg: 'Send a pre-formatted WhatsApp reminder with payment link',
  callNow: 'Call',
  noParties: 'No parties yet',
  noPartiesDesc: 'Add your first customer or supplier to start tracking Udhari',
  noEntries: 'No ledger entries yet',
  searchParties: 'Search by name or phone...',
  totalReceivable: 'Total Receivable',
  totalPayable: 'Total Payable',
  profilePhoto: 'Photo',
  contactDetails: 'Contact Details',
  paymentLink: 'Payment Link',
  cashEntry: 'Cash Entry',
  addCashEntry: 'Add Cash Entry',
  editCashEntry: 'Edit Cash Entry',
  cashEntryDesc: 'Record an increase or decrease in Galla or Cash in Hand.',
  dukanGalla: 'Dukan Galla',
  cashBox: 'Cash Box',
  physicalCash: 'Physical cash',
  increase: 'Increase',
  decrease: 'Decrease',
  reasonNote: 'Reason / Note',
  openingCashPlaceholder: 'e.g. Opening cash',
  saveEntry: 'Save Entry',
  cashTransactions: 'Cash Transactions',
  noCashEntries: 'No cash entries yet.',
  noCashEntriesDesc: 'Add a cash entry to start tracking Galla or Cash in Hand.',
  manageFromSource: 'Manage from source page',
  openTransactions: 'Open Transactions',
  // Inventory
  navInventory: 'Inventory',
  inventoryTitle: 'Inventory Management',
  inventorySubtitle: 'Manage stock items with pricing, low stock alerts, and POS visibility',
  addItem: 'Add Item',
  editItem: 'Edit Item',
  itemName: 'Item Name',
  unit: 'Unit',
  purchasePrice: 'Purchase Price',
  sellingPrice: 'Selling Price',
  currentStock: 'Current Stock',
  minStock: 'Minimum Stock',
  showOnPOS: 'Show on POS Page',
  showOnPOSYes: 'Yes',
  showOnPOSNo: 'No',
  itemPhoto: 'Item Photo',
  addPhoto: 'Add Photo',
  noItems: 'No items yet',
  noItemsDesc: 'Add your first inventory item to start tracking stock',
  searchItems: 'Search items...',
  totalItems: 'Total Items',
  lowStockCount: 'Low Stock',
  totalStockValue: 'Stock Value',
  stockLevel: 'Stock Level',
  good: 'Good',
  low: 'Low',
  critical: 'Critical',
  out: 'Out of Stock',
  wellStocked: 'Well Stocked',
  profitMargin: 'Margin',
  actions: 'Actions',
  confirmDelete: 'Delete Item?',
  confirmDeleteDesc: 'This will permanently remove the item from your inventory.',
  bankingTitle: 'Bank & Savings Accounts',
  bankingSubTitle: 'Manage your main bank accounts and sub-savings schemes — all in one dashboard.',
  bankMainAccounts: 'Main Accounts',
  bankSavingsInvestments: 'Savings & Investments',
  bankMainTab: 'Main Bank Accounts',
  bankSubTab: 'Sub-Savings',
  bankAccountsLabel: 'Bank Accounts',
  bankAccountConnected: 'account connected',
  bankAccountsConnected: 'accounts connected',
  bankNoAccounts: 'No bank accounts yet',
  bankAddFirst: 'Add your first bank account to start tracking.',
  bankAddAccount: 'Add Bank Account',
  bankSubAccountsLabel: 'Sub-Savings Accounts',
  bankSchemeTracked: 'scheme tracked',
  bankSchemesTracked: 'schemes tracked',
  bankNoSubSavings: 'No sub-savings yet',
  bankAddSubDesc: 'Add a Daily Pigmy, RD, FD, or Gold Savings scheme.',
  bankAddSub: 'Add Sub-Savings',
  transactionManagement: 'Transaction Management',
  transactionSubtitle: 'Track income, expenses, and transfers across your accounts and Galla.',
  netPL: 'Net P&L',
  entries: 'entries',
  gallaCashBox: 'Galla (Cash Box)',
  currentCashOnHand: 'Current cash on hand for daily shop use',
  expenseBreakdownTitle: 'Expense Breakdown',
  personalVsBusiness: 'Personal vs Business',
  noFilteredTransactions: 'No transactions found for this filter.',
  useAddTransaction: 'Use the "Add Transaction" button to create one.',
  addBankTitle: 'Add Bank Account',
  addBankDesc: 'Enter your bank account details to track and manage it from one place.',
  bankNameLabel: 'Bank Name',
  holderNameLabel: 'Account Holder Name',
  accountNumberLabel: 'Account Number',
  ifscLabel: 'IFSC Code',
  optionalLabel: 'Optional',
  accountTypeLabel: 'Account Type',
  openingBalanceLabel: 'Opening Balance (₹)',
  addAccountBtn: 'Add Account',
  addSubTitle: 'Add Sub-Savings Account',
  addSubDesc: 'Add a recurring deposit, fixed deposit, pigmy, or gold savings scheme.',
  schemeTypeLabel: 'Scheme Type',
  schemeNumberLabel: 'Account / Scheme Number',
  linkedMainAccountLabel: 'Linked Main Bank Account',
  noLinkedAccountLabel: 'No linked account',
  dailyAmountLabel: 'Daily Amount (₹)',
  initialDepositLabel: 'Initial Deposit (₹)',
  interestRateLabel: 'Interest Rate (%)',
  maturityDateLabel: 'Maturity Date',
  addSchemeBtn: 'Add Scheme',
  addTransactionDesc: 'Record a new income, expense, or transfer between accounts.',
  amountRupeeLabel: 'Amount (₹)',
  descriptionNoteLabel: 'Description / Note',
  tagPersonalBusiness: 'Tag (Personal vs Business)',
  depositToLabel: 'Deposit To',
  paidFromLabel: 'Paid From',
  fromLabel: 'From',
  toLabel: 'To',
  selectDestination: 'Select destination account',
  gallaTransferHint: 'Transferring from Galla to a bank account deposits cash into the bank.',
  gallaExpenseHint: 'This expense will be tracked as paid from Galla (Cash Box) for P&L audit.',
  editTransactionTitle: 'Edit Transaction',
  updateTransactionDesc: 'Update the transaction details below.',
  copyUpi: 'Copy UPI ID',
  showQr: 'Show QR Code',
  copied: 'Copied!',
  scanQrHint: 'Scan this QR to make a UPI payment to this account.',
  editBankTitle: 'Edit Bank Account',
  updateBankDesc: 'Update your bank account details below.',
  noDeleteBankWarning: 'This bank account has linked transactions or savings schemes. Delete those related records first.',
  saveChangesBtn: 'Save Changes',
  noTransactions: 'No transactions yet',
  addEntryHint: 'Add an income, expense, or transfer to see it here.',
  schemeLabel: 'Scheme',
  linkedBankLabel: 'Linked Bank',
  depositLabel: 'Deposit',
  interestLabel: 'Interest',
  statusLabel: 'Status',
  allLabel: 'All',
  personalLabel: 'Personal',
  businessLabel: 'Business',
  tagLabel: 'Tag',
  savingsLabel: 'Savings',
  currentLabel: 'Current',
  categoryLabel: 'Category',
  // Settings
  navSettings: 'Settings',
  settingsTitle: 'Settings & Customization',
  businessLogo: 'Business Logo',
  businessLogoDesc: 'This logo appears beside the Dashboard greeting.',
  uploadBusinessLogo: 'Upload Logo',
  removeBusinessLogo: 'Remove',
  mobileBottomBar: 'Mobile Bottom Bar',
  mobileBottomBarDesc: 'Center Home stays fixed; choose pages for buttons 1, 2 and 4.',
  button1: 'Button 1',
  button2: 'Button 2',
  button4: 'Button 4',
  settingsSubtitle: 'Manage your profile, business details, and receipt branding',
  profileSection: 'Profile',
  businessSection: 'Business Details',
  brandingSection: 'Receipt Branding',
  ownerName: 'Owner Name',
  businessName: 'Business Name',
  businessAddress: 'Business Address',
  gstin: 'GSTIN',
  signatureUrl: 'Authorized Signature',
  stampUrl: 'Business Stamp',
  uploadSignature: 'Upload Signature',
  uploadStamp: 'Upload Stamp',
  removeSignature: 'Remove Signature',
  removeStamp: 'Remove Stamp',
  signaturePreview: 'Signature Preview',
  stampPreview: 'Stamp Preview',
  settingsSaved: 'Settings Saved',
  settingsSavedDesc: 'Your changes have been saved successfully.',
  saveChanges: 'Save Changes',
  resetToDefault: 'Reset to Default',
  resetConfirm: 'Reset all settings?',
  resetConfirmDesc: 'This will restore default profile and business details.',
  ownerInfo: 'Personal Information',
  ownerInfoDesc: 'Your name and contact details as the shop owner',
  businessInfo: 'Business Information',
  businessInfoDesc: 'Your shop name, address, and tax details shown on receipts',
  receiptBranding: 'Receipt Branding',
  receiptBrandingDesc: 'Upload your signature and stamp to appear on printed receipts',
  personalInfo: 'Personal Information',
  personalInfoDesc: 'Your personal contact details',
  // Reports & Analytics
  navReports: 'Reports',
  reportsTitle: 'Reports & Analytics',
  reportsSubtitle: 'Day Book, Profit & Loss, expense breakdowns and exportable analytics',
  dayBook: 'Day Book',
  profitLoss: 'Profit & Loss',
  expenseBreakup: 'Expense Breakup',
  analytics: 'Analytics',
  exportCsv: 'Export CSV',
  exportExcel: 'Export Excel',
  exportPdf: 'Export PDF',
  totalIncome: 'Total Income',
  totalExpense: 'Total Expense',
  netProfit: 'Net Profit',
  netLoss: 'Net Loss',
  closingBalance: 'Closing Balance',
  txnCount: 'Transactions',
  revenueByCategory: 'Revenue by Category',
  expenseByCategory: 'Expense by Category',
  dailyTrend: 'Daily Trend',
  topIncome: 'Top Income Sources',
  topExpense: 'Top Expenses',
  noData: 'No data for this period',
  noDataDesc: 'Try selecting a different date range',
  slNo: '#',
  particulars: 'Particulars',
  type: 'Type',
  exportReport: 'Export Report',
  revenue: 'Revenue',
  profit: 'Profit',
  loss: 'Loss',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  startDate: 'Start Date',
  endDate: 'End Date',
  applyRange: 'Apply Range',
  addFinancialGoal: 'Add Financial Goal',
  goalTitle: 'Goal Title',
  savedSoFar: 'Saved So Far (₹)',
  deadline: 'Deadline',
  appSecurity: 'App Security',
  appSecurityDesc: 'Lock the app with a PIN or fingerprint after opening it.',
  appLockPin: 'App Lock PIN',
  pinDigitsDesc: 'Set a 4 to 6 digit PIN.',
  fingerprintLock: 'Fingerprint / Thumb Lock',
  biometricDesc: 'Uses your device biometric authentication. Fingerprint data is not stored in the app.',
  unlockWithPin: 'Unlock with PIN',
  unlockWithFingerprint: 'Unlock with Fingerprint',
  shopOwner: 'Shop Owner',
  remove: 'Remove',
  cashManagement: 'Cash Management',
  cashPageTitle: 'Cash (Dukan Galla), Cash in Hand',
  cashPageDesc: 'Manage increases, decreases and transaction history for both cash accounts.',
  mainShopCashBox: 'Main shop cash box',
  separatePhysicalCash: 'Separate physical cash balance',
  cashPageEntriesDesc: 'Cash-page entries can be edited/deleted here. Entries from other modules stay protected here.',
  cashPageAddEntry: 'Add Cash Entry',
};

const mr: Translations = {
  appName: 'फायनान्सहब',
  navDashboard: 'होम',
  navBanking: 'बँक व बचत',
  navTransactions: 'व्यवहार',
  navPos: 'पीओएस बिलिंग',
  navInvoice: 'इनव्हॉइस',
  navSalesHistory: 'विक्री इतिहास',
  navAssistant: 'एआय सहाय्यक',
  navMenu: 'मेन्यू',
  darkMode: 'डार्क मोड',
  lightMode: 'लाईट मोड',
  goodMorning: 'सुप्रभात',
  goodAfternoon: 'शुभ दुपार',
  goodEvening: 'शुभ संध्याकाळ',
  today: 'आज',
  yesterday: 'काल',
  thisWeek: 'या आठवड्यात',
  thisMonth: 'या महिन्यात',
  customRange: 'कस्टम रेंज',
  netWorth: 'एकूण संपत्ती',
  netWorthSubtitle: 'सर्व खाती व बचतींची एकूण रक्कम',
  cashGalla: 'रोख (दुकान गल्ला)',
  cashInHand: 'हातातील रोख',
  totalBalance: 'एकूण शिल्लक',
  totalExpenses: 'एकूण खर्च',
  totalSavings: 'एकूण बचत',
  bankBalance: 'बँक शिल्लक',
  todaySale: 'आजची विक्री',
  todayExpenses: 'आजचा खर्च',
  monthSale: 'या महिन्याची विक्री',
  netProfitMonth: 'निव्ळा नफा (महिना)',
  financialGoals: 'आर्थिक उद्दिष्टे',
  targetAmount: 'लक्ष्य',
  savedAmount: 'जमा',
  remaining: 'उरलेले',
  addGoal: 'उद्दिष्ट जोडा',
  quickActions: 'त्वरित क्रिया',
  quickExpense: 'त्वरित खर्च',
  addSale: 'विक्री जोडा',
  quickTransfer: 'त्वरित हस्तांतरण',
  recentTransactions: 'अलीकडील व्यवहार',
  viewAll: 'सर्व पहा',
  lowStockAlerts: 'कमी स्टॉक सूचना',
  noAlerts: 'सर्व वस्तू पुरेशा आहेत',
  income: 'उत्पन्न',
  expense: 'खर्च',
  transfer: 'हस्तांतरण',
  description: 'वर्णन',
  amount: 'रक्कम',
  date: 'तारीख',
  category: 'श्रेणी',
  addTransaction: 'व्यवहार जोडा',
  cancel: 'रद्द करा',
  save: 'जतन करा',
  edit: 'संपादन',
  delete: 'हटवा',
  search: 'शोधा',
  welcome: 'पुन्हा स्वागत आहे',
  // POS
  posBilling: 'पीओएस बिलिंग',
  posSubtitle: 'तुमच्या दुकानासाठी त्वरित बिलिंग व चेकआउट',
  searchProducts: 'वस्तू शोधा...',
  allCategories: 'सर्व श्रेणी',
  cart: 'कार्ट',
  cartEmpty: 'कार्ट रिकामी आहे',
  cartEmptyDesc: 'कार्टमध्ये वस्तू जोडण्यासाठी क्लिक करा',
  subtotal: 'उपएकूण',
  discount: 'सूट',
  total: 'एकूण',
  checkout: 'चेकआउट',
  clearCart: 'रिकामे करा',
  paymentMethod: 'पेमेंट पद्धत',
  cash: 'रोख',
  upi: 'यूपीआय',
  card: 'कार्ड',
  customerName: 'ग्राहकाचे नाव',
  customerNamePlaceholder: 'थेट ग्राहक',
  generateBill: 'बिल तयार करा',
  receipt: 'पावती',
  print: 'प्रिंट',
  print2inch: '2-इंच थर्मल',
  print3inch: '3-इंच थर्मल',
  closeReceipt: 'बंद करा',
  newBill: 'नवीन बिल',
  invoiceNo: 'बिल क्रमांक',
  item: 'वस्तू',
  qty: 'संख्या',
  rate: 'दर',
  amt: 'रक्कम',
  thankYou: 'धन्यवाद! पुन्हा भेट द्या.',
  authorizedSignature: 'अधिकृत सही',
  stamp: 'शिक्का',
  scanToPay: 'पेमेंटसाठी स्कॅन करा',
  paidVia: 'पेमेंट केले',
  showPOSOnly: 'पीओएस वस्तू',
  allProducts: 'सर्व वस्तू',
  outOfStock: 'स्टॉक संपला',
  inStock: 'स्टॉक',
  billSummary: 'बिल सारांश',
  itemsInCart: 'कार्टमधील वस्तू',
  savedBills: 'सेव्ह केलेली बिले',
  savedBillsDesc: 'बिल क्रमांक किंवा ग्राहकाच्या नावावरून बिल शोधा आणि संपादित किंवा हटवा.',
  billSearchPlaceholder: 'बिल क्रमांक / ग्राहकाचे नाव',
  noSavedBills: 'कोणतेही सेव्ह केलेले बिल सापडले नाही.',
  walkInCustomer: 'थेट ग्राहक',
  itemsLabel: 'वस्तू',
  billEditMode: 'बिल संपादन मोड',
  noProductsFound: 'कोणत्याही वस्तू सापडल्या नाहीत',
  // Ledger / Udhari
  navLedger: 'खाते',
  navCash: 'रोख',
  ledgerTitle: 'ग्राहक व पुरवठादार',
  ledgerSubtitle: 'उधारी शिल्लक ट्रॅक करा, पेमेंट सूचना पाठवा आणि संपर्क प्रोफाइल व्यवस्थापित करा',
  customers: 'ग्राहक',
  suppliers: 'पुरवठादार',
  allParties: 'सर्व',
  addParty: 'पक्ष जोडा',
  importParties: 'पक्ष आयात करा',
  fromYourContacts: 'तुमच्या संपर्कातून',
  searchContacts: 'नाव किंवा मोबाईलने संपर्क शोधा',
  noContactsFound: 'कोणतेही संपर्क सापडले नाहीत',
  contactsPermissionDenied: 'संपर्क परवानगी नाकारली आहे.',
  contactAccessRequired: 'पक्ष आयात करण्यासाठी संपर्क परवानगी द्या.',
  partyGstin: 'जीएसटीआयएन',
  saveParty: 'पक्ष जतन करा',
  saveAndNew: 'जतन करा व नवीन',
  addNewParty: 'नवीन पक्ष जोडा',
  createInvoiceSale: 'बिल / विक्री तयार करा',
  addBankAccount: 'बँक / खाते जोडा',
  invoicePage: 'बिल पृष्ठ',
  share: 'शेअर',
  editParty: 'पक्ष संपादन',
  deleteParty: 'पक्ष हटवा',
  partyName: 'नाव',
  partyType: 'प्रकार',
  customer: 'ग्राहक',
  supplier: 'पुरवठादार',
  phone: 'फोन',
  email: 'ईमेल',
  address: 'पत्ता',
  upiId: 'यूपीआय आयडी',
  notes: 'टीप',
  openingBalance: 'प्रारंभ शिल्लक',
  udhariBalance: 'उधारी शिल्लक',
  balanceGiven: 'तुम्ही दिले',
  balanceReceived: 'तुम्ही मिळवले',
  settled: 'पूर्ण झाले',
  addEntry: 'नोंद जोडा',
  entryType: 'नोंद प्रकार',
  given: 'दिले',
  received: 'मिळाले',
  entryAmount: 'रक्कम',
  entryDescription: 'वर्णन',
  entryDate: 'तारीख',
  ledgerHistory: 'खाते इतिहास',
  whatsappReminder: 'व्हॉट्सअॅप सूचना',
  whatsappReminderMsg: 'पेमेंट लिंकसह पूर्व-स्वरूपित व्हॉट्सअॅप सूचना पाठवा',
  callNow: 'कॉल',
  noParties: 'अद्याप कोणीही नाही',
  noPartiesDesc: 'उधारी ट्रॅकिंग सुरू करण्यासाठी ग्राहक किंवा पुरवठादार जोडा',
  noEntries: 'अद्याप कोणत्याही नोंदी नाहीत',
  searchParties: 'नाव किंवा फोन शोधा...',
  totalReceivable: 'एकूण प्राप्य',
  totalPayable: 'एकूण देय',
  profilePhoto: 'फोटो',
  contactDetails: 'संपर्क तपशील',
  paymentLink: 'पेमेंट लिंक',
  cashEntry: 'रोख नोंद',
  addCashEntry: 'रोख नोंद जोडा',
  editCashEntry: 'रोख नोंद संपादित करा',
  cashEntryDesc: 'दुकान गल्ला किंवा हातातील रोख रक्कम वाढवा किंवा कमी करा.',
  dukanGalla: 'दुकान गल्ला',
  cashBox: 'रोख पेटी',
  physicalCash: 'हातातील रोख',
  increase: 'वाढवा',
  decrease: 'कमी करा',
  reasonNote: 'कारण / नोंद',
  openingCashPlaceholder: 'उदा. सुरुवातीची रोख रक्कम',
  saveEntry: 'नोंद जतन करा',
  cashTransactions: 'रोख व्यवहार',
  noCashEntries: 'अद्याप कोणतीही रोख नोंद नाही.',
  noCashEntriesDesc: 'गल्ला किंवा हातातील रोख रक्कम ट्रॅक करण्यासाठी नोंद जोडा.',
  manageFromSource: 'मूळ पेजवरून व्यवस्थापित करा',
  openTransactions: 'व्यवहार उघडा',
  // Inventory
  navInventory: 'इन्व्हेंटरी',
  inventoryTitle: 'इन्व्हेंटरी व्यवस्थापन',
  inventorySubtitle: 'किंमत, कमी स्टॉक सूचना आणि पीओएस दृश्यासह स्टॉक व्यवस्थापित करा',
  addItem: 'वस्तू जोडा',
  editItem: 'वस्तू संपादन',
  itemName: 'वस्तूचे नाव',
  unit: 'एकक',
  purchasePrice: 'खरेदी किंमत',
  sellingPrice: 'विक्री किंमत',
  currentStock: 'सध्याचा स्टॉक',
  minStock: 'किमान स्टॉक',
  showOnPOS: 'पीओएस पृष्ठावर दाखवा',
  showOnPOSYes: 'होय',
  showOnPOSNo: 'नाही',
  itemPhoto: 'वस्तूचा फोटो',
  addPhoto: 'फोटो जोडा',
  noItems: 'अद्याप कोणत्याही वस्तू नाहीत',
  noItemsDesc: 'स्टॉक ट्रॅकिंग सुरू करण्यासाठी पहिली वस्तू जोडा',
  searchItems: 'वस्तू शोधा...',
  totalItems: 'एकूण वस्तू',
  lowStockCount: 'कमी स्टॉक',
  totalStockValue: 'स्टॉक मूल्य',
  stockLevel: 'स्टॉक पातळी',
  good: 'चांगले',
  low: 'कमी',
  critical: 'गंभीर',
  out: 'स्टॉक संपला',
  wellStocked: 'पुरेसा स्टॉक',
  profitMargin: 'फायदा',
  actions: 'क्रिया',
  confirmDelete: 'वस्तू हटवायची?',
  confirmDeleteDesc: 'हे वस्तू इन्व्हेंटरीमधून कायमचे काढून टाकेल.',
  bankingTitle: 'बँक आणि बचत खाती',
  bankingSubTitle: 'तुमची मुख्य बँक खाती आणि उप-बचत योजना एकाच ठिकाणी व्यवस्थापित करा.',
  bankMainAccounts: 'मुख्य खाती',
  bankSavingsInvestments: 'बचत आणि गुंतवणूक',
  bankMainTab: 'मुख्य बँक खाती',
  bankSubTab: 'उप-बचत',
  bankAccountsLabel: 'बँक खाती',
  bankAccountConnected: 'खाते जोडलेले',
  bankAccountsConnected: 'खाती जोडलेली',
  bankNoAccounts: 'अजून बँक खाती नाहीत',
  bankAddFirst: 'नोंद ठेवण्यासाठी पहिले बँक खाते जोडा.',
  bankAddAccount: 'बँक खाते जोडा',
  bankSubAccountsLabel: 'उप-बचत खाती',
  bankSchemeTracked: 'योजना नोंदवली',
  bankSchemesTracked: 'योजना नोंदवल्या',
  bankNoSubSavings: 'अजून उप-बचत नाही',
  bankAddSubDesc: 'डेली पिग्मी, आरडी, एफडी किंवा गोल्ड सेव्हिंग योजना जोडा.',
  bankAddSub: 'उप-बचत जोडा',
  transactionManagement: 'व्यवहार व्यवस्थापन',
  transactionSubtitle: 'तुमच्या खात्यांमधील उत्पन्न, खर्च आणि हस्तांतरण नोंदवा.',
  netPL: 'निव्वळ नफा-तोटा',
  entries: 'नोंदी',
  gallaCashBox: 'गल्ला (रोख पेटी)',
  currentCashOnHand: 'दुकानाच्या दैनंदिन वापरासाठी सध्याची रोख रक्कम',
  expenseBreakdownTitle: 'खर्चाचे विभाजन',
  personalVsBusiness: 'वैयक्तिक विरुद्ध व्यवसाय',
  noFilteredTransactions: 'या फिल्टरसाठी कोणतेही व्यवहार सापडले नाहीत.',
  useAddTransaction: 'व्यवहार तयार करण्यासाठी "व्यवहार जोडा" बटण वापरा.',
  addBankTitle: 'बँक खाते जोडा',
  addBankDesc: 'तुमचे बँक खाते तपशील येथे भरा आणि एका ठिकाणी व्यवस्थापित करा.',
  bankNameLabel: 'बँकेचे नाव',
  holderNameLabel: 'खातेदाराचे नाव',
  accountNumberLabel: 'खाते क्रमांक',
  ifscLabel: 'आयएफएससी कोड',
  optionalLabel: 'ऐच्छिक',
  accountTypeLabel: 'खात्याचा प्रकार',
  openingBalanceLabel: 'प्रारंभिक शिल्लक (₹)',
  addAccountBtn: 'खाते जोडा',
  addSubTitle: 'उप-बचत खाते जोडा',
  addSubDesc: 'आरडी, एफडी, डेली पिग्मी किंवा गोल्ड सेव्हिंग योजना जोडा.',
  schemeTypeLabel: 'योजनेचा प्रकार',
  schemeNumberLabel: 'खाते / योजना क्रमांक',
  linkedMainAccountLabel: 'जोडलेले मुख्य बँक खाते',
  noLinkedAccountLabel: 'कोणतेही खाते जोडलेले नाही',
  dailyAmountLabel: 'दैनिक रक्कम (₹)',
  initialDepositLabel: 'प्रारंभिक ठेव (₹)',
  interestRateLabel: 'व्याजदर (%)',
  maturityDateLabel: 'परिपक्वता तारीख',
  addSchemeBtn: 'योजना जोडा',
  addTransactionDesc: 'नवीन उत्पन्न, खर्च किंवा खात्यांमधील हस्तांतरण नोंदवा.',
  amountRupeeLabel: 'रक्कम (₹)',
  descriptionNoteLabel: 'तपशील / नोंद',
  tagPersonalBusiness: 'टॅग (वैयक्तिक विरुद्ध व्यवसाय)',
  depositToLabel: 'जमा कुठे',
  paidFromLabel: 'खर्च कुठून',
  fromLabel: 'कडून',
  toLabel: 'कडे',
  selectDestination: 'गंतव्य खाते निवडा',
  gallaTransferHint: 'गल्ल्यातून बँक खात्यात हस्तांतरण केल्यास रोख रक्कम बँकेत जमा म्हणून नोंदवली जाईल.',
  gallaExpenseHint: 'हा खर्च पी अँड एल तपासणीसाठी गल्ल्यातून दिला म्हणून नोंदवला जाईल.',
  editTransactionTitle: 'व्यवहार संपादित करा',
  updateTransactionDesc: 'खालील व्यवहार तपशील अद्यतनित करा.',
  copyUpi: 'यूपीआय आयडी कॉपी करा',
  showQr: 'क्यूआर कोड दाखवा',
  copied: 'कॉपी झाले!',
  scanQrHint: 'या खात्यावर यूपीआय पेमेंट करण्यासाठी हा क्यूआर स्कॅन करा.',
  editBankTitle: 'बँक खाते संपादित करा',
  updateBankDesc: 'खालील बँक खाते तपशील अद्यतनित करा.',
  noDeleteBankWarning: 'या बँक खात्याशी संबंधित व्यवहार किंवा बचत योजना आहेत. आधी संबंधित नोंदी हटवा.',
  saveChangesBtn: 'बदल जतन करा',
  noTransactions: 'अजून व्यवहार नाहीत',
  addEntryHint: 'येथे पाहण्यासाठी उत्पन्न, खर्च किंवा हस्तांतरण जोडा.',
  schemeLabel: 'योजना',
  linkedBankLabel: 'जोडलेली बँक',
  depositLabel: 'ठेव',
  interestLabel: 'व्याज',
  statusLabel: 'स्थिती',
  allLabel: 'सर्व',
  personalLabel: 'वैयक्तिक',
  businessLabel: 'व्यवसाय',
  tagLabel: 'टॅग',
  savingsLabel: 'बचत',
  currentLabel: 'चालू',
  categoryLabel: 'श्रेणी',
  // Settings
  navSettings: 'सेटिंग्ज',
  settingsTitle: 'सेटिंग्ज आणि सानुकूलन',
  businessLogo: 'बिझनेस लोगो',
  businessLogoDesc: 'हा लोगो Dashboard वरील greeting च्या आधी दिसेल.',
  uploadBusinessLogo: 'लोगो अपलोड करा',
  removeBusinessLogo: 'काढा',
  mobileBottomBar: 'मोबाइल मेनू बार',
  mobileBottomBarDesc: 'मध्यभागी Home कायम राहील; 1, 2 व 4 क्रमांकाची बटणे येथे सेट करा.',
  button1: 'बटण 1',
  button2: 'बटण 2',
  button4: 'बटण 4',
  settingsSubtitle: 'तुमची प्रोफाइल, व्यवसाय तपशील आणि पावती ब्रँडिंग व्यवस्थापित करा',
  profileSection: 'प्रोफाइल',
  businessSection: 'व्यवसाय तपशील',
  brandingSection: 'पावती ब्रँडिंग',
  ownerName: 'मालकाचे नाव',
  businessName: 'व्यवसायाचे नाव',
  businessAddress: 'व्यवसाय पत्ता',
  gstin: 'जीएसटीआयएन',
  signatureUrl: 'अधिकृत सही',
  stampUrl: 'व्यवसाय शिक्का',
  uploadSignature: 'सही अपलोड करा',
  uploadStamp: 'शिक्का अपलोड करा',
  removeSignature: 'सही काढा',
  removeStamp: 'शिक्का काढा',
  signaturePreview: 'सही पूर्वावलोकन',
  stampPreview: 'शिक्का पूर्वावलोकन',
  settingsSaved: 'सेटिंग्ज जतन झाल्या',
  settingsSavedDesc: 'तुमचे बदल यशस्वीरित्या जतन झाले आहेत.',
  saveChanges: 'बदल जतन करा',
  resetToDefault: 'डिफॉल्टवर परत करा',
  resetConfirm: 'सर्व सेटिंग्ज रीसेट करायच्या?',
  resetConfirmDesc: 'हे डिफॉल्ट प्रोफाइल आणि व्यवसाय तपशील पुनर्स्थापित करेल.',
  ownerInfo: 'वैयक्तिक माहिती',
  ownerInfoDesc: 'दुकान मालक म्हणून तुमचे नाव आणि संपर्क तपशील',
  businessInfo: 'व्यवसाय माहिती',
  businessInfoDesc: 'पावतीवर दिसणारे तुमचे दुकानाचे नाव, पत्ता आणि कर तपशील',
  receiptBranding: 'पावती ब्रँडिंग',
  receiptBrandingDesc: 'प्रिंट केलेल्या पावतीवर दिसणारी तुमची सही आणि शिक्का अपलोड करा',
  personalInfo: 'वैयक्तिक माहिती',
  personalInfoDesc: 'तुमचे वैयक्तिक संपर्क तपशील',
  // Reports & Analytics
  navReports: 'अहवाल',
  reportsTitle: 'अहवाल आणि विश्लेषण',
  reportsSubtitle: 'दिवस पुस्तिका, नफा-तोटा, खर्च विश्लेषण आणि निर्यात योग्य आलेख',
  dayBook: 'दिवस पुस्तिका',
  profitLoss: 'नफा-तोटा',
  expenseBreakup: 'खर्च विश्लेषण',
  analytics: 'विश्लेषण',
  exportCsv: 'सीएसव्ही निर्यात',
  exportExcel: 'एक्सेल निर्यात',
  exportPdf: 'पीडीएफ निर्यात',
  totalIncome: 'एकूण उत्पन्न',
  totalExpense: 'एकूण खर्च',
  netProfit: 'निव्ळा नफा',
  netLoss: 'निव्ळी तोटा',
  closingBalance: 'समाप्त शिल्लक',
  txnCount: 'व्यवहार',
  revenueByCategory: 'श्रेणीनुसार उत्पन्न',
  expenseByCategory: 'श्रेणीनुसार खर्च',
  dailyTrend: 'दैनिक ट्रेंड',
  topIncome: 'उत्पन्नाचे मुख्य स्रोत',
  topExpense: 'मुख्य खर्च',
  noData: 'या कालावधीसाठी डेटा नाही',
  noDataDesc: 'वेगळी तारीख श्रेणी निवडा',
  slNo: '#',
  particulars: 'तपशील',
  type: 'प्रकार',
  exportReport: 'अहवाल निर्यात',
  revenue: 'उत्पन्न',
  profit: 'नफा',
  loss: 'तोटा',
  daily: 'दैनिक',
  weekly: 'साप्ताहिक',
  monthly: 'मासिक',
  startDate: 'सुरुवातीची तारीख',
  endDate: 'शेवटची तारीख',
  applyRange: 'रेंज लागू करा',
  addFinancialGoal: 'आर्थिक उद्दिष्ट जोडा',
  goalTitle: 'उद्दिष्टाचे नाव',
  savedSoFar: 'आतापर्यंत जमा (₹)',
  deadline: 'अंतिम तारीख',
  appSecurity: 'अॅप सुरक्षा',
  appSecurityDesc: 'अॅप उघडल्यानंतर PIN किंवा फिंगरप्रिंटने लॉक करा.',
  appLockPin: 'अॅप लॉक PIN',
  pinDigitsDesc: '४ ते ६ अंकी PIN सेट करा.',
  fingerprintLock: 'फिंगरप्रिंट / अंगठा लॉक',
  biometricDesc: 'डिव्हाइसच्या बायोमेट्रिक प्रमाणीकरणाचा वापर होईल. फिंगरप्रिंट डेटा अॅपमध्ये जतन होत नाही.',
  unlockWithPin: 'PIN ने अनलॉक करा',
  unlockWithFingerprint: 'फिंगरप्रिंटने अनलॉक करा',
  shopOwner: 'दुकान मालक',
  remove: 'काढा',
  cashManagement: 'रोख व्यवस्थापन',
  cashPageTitle: 'रोख (दुकान गल्ला), हातातील रोख',
  cashPageDesc: 'दोन्ही रोख खात्यांची वाढ, घट आणि व्यवहार इतिहास येथे व्यवस्थापित करा.',
  mainShopCashBox: 'दुकानातील मुख्य रोख पेटी',
  separatePhysicalCash: 'हातातील स्वतंत्र रोख शिल्लक',
  cashPageEntriesDesc: 'या पेजवरील रोख नोंदी येथे संपादित/हटवता येतात. इतर मॉड्यूलमधील नोंदी येथे सुरक्षित राहतात.',
  cashPageAddEntry: 'रोख नोंद जोडा',
};

export const translations: Record<Language, Translations> = { en, mr };
export function localizeBankingValue(value: string, language: Language): string {
  if (language === 'en') return value;
  const map: Record<string, string> = {
    Savings: 'बचत', Current: 'चालू',
    'Daily Pigmy': 'डेली पिग्मी', RD: 'आरडी', FD: 'एफडी', 'Gold Savings': 'गोल्ड सेव्हिंग',
    Income: 'उत्पन्न', Expense: 'खर्च', Transfer: 'हस्तांतरण',
    'Personal / House': 'वैयक्तिक / घर', 'Shop / Business': 'दुकान / व्यवसाय',
    Salary: 'पगार', 'Business Revenue': 'व्यवसाय उत्पन्न', Other: 'इतर',
    Rent: 'भाडे', Utilities: 'उपयुक्तता बिले', Groceries: 'किराणा', Supplies: 'साहित्य',
    Maintenance: 'देखभाल', Transport: 'वाहतूक', Food: 'अन्न', Personal: 'वैयक्तिक',
    Active: 'सक्रिय', Matured: 'परिपक्व', Closed: 'बंद', Unlinked: 'न जोडलेले', Unknown: 'अज्ञात',
  };
  return map[value] ?? value;
}
