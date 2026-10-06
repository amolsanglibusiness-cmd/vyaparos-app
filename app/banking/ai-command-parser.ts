import type { Transaction, TransactionType, Invoice, CartItem, POSProduct, InventoryItem } from './types';
import { CASH_IN_HAND_ID, GALLA_ID } from './mock-data';
import { normalizeAppVocabulary } from './ai-vocabulary';

export type AssistantDraft = Omit<Transaction, 'id' | 'createdAt'> & { kind: 'transaction' };
export type AssistantInvoiceDraft = { kind: 'invoice'; invoice: Invoice; customerName: string; itemName: string };
export type AssistantIntent = AssistantDraft | AssistantInvoiceDraft;

/** High-level NLP intent names. Existing UI continues to consume AssistantIntent. */
export type AssistantIntentName =
  | 'ADD_CUSTOMER'
  | 'ADD_ITEM'
  | 'CREATE_BILL'
  | 'ADD_INCOME'
  | 'ADD_EXPENSE'
  | 'MONEY_TRANSFER'
  | 'CHECK_BALANCE'
  | 'REPORT'
  | 'NAVIGATION'
  | 'UNKNOWN';

export type AssistantEntities = {
  amount: number | null;
  amounts: number[];
  customerName: string | null;
  itemName: string | null;
  itemNames: string[];
  quantities: number[];
};

const digitMap: Record<string, string> = { '०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9' };
const marathiUnits: Record<string, number> = {
  'शून्य':0,'एक':1,'दोन':2,'तीन':3,'चार':4,'पाच':5,'सहा':6,'सात':7,'आठ':8,'नऊ':9,'दहा':10,'अकरा':11,'बारा':12,'तेरा':13,'चौदा':14,'पंधरा':15,'सोळा':16,'सतरा':17,'अठरा':18,'एकोणीस':19,'वीस':20,'तीस':30,'चाळीस':40,'पन्नास':50,'साठ':60,'सत्तर':70,'ऐंशी':80,'नव्वद':90,'शंभर':100,'दीडशे':150,'दोनशे':200,'अडीचशे':250,'तीनशे':300,'चारशे':400,'पाचशे':500,'सहाशे':600,'सातशे':700,'आठशे':800,'नऊशे':900,'हजार':1000,'लाख':100000,'कोटी':10000000,
};

function normalizeDigits(value: string) { return value.replace(/[०-९]/g, d => digitMap[d] ?? d); }

function parseWordNumber(value: string): number | null {
  const text = value.trim()
    .replace(/[₹,]/g, ' ')
    .replace(/रुपयांचे|रुपयांचा|रुपयांची|रुपयाचे|रुपायांचे|रुपायांचा|रुपायांची|रुपायाचे|रुपये|रुपया|रुपय|रक्कम/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text);
  let total = 0;
  let current = 0;
  let found = false;
  for (const token of text.split(/\s+/)) {
    const n = marathiUnits[token];
    if (n == null) continue;
    found = true;
    if (n === 1000 || n === 100000 || n === 10000000) {
      total += (current || 1) * n;
      current = 0;
    } else current += n;
  }
  return found ? total + current : null;
}

const moneyPattern = '(?:₹|rs\\.?|inr\\.?|रु\\.?|रुपये?|रुपयांचा|रुपयांची|रुपयाचे|रुपायांचा|रुपायांची|रुपायाचे)?\\s*\\d[\\d,]*(?:\\.\\d+)?';
const numberOnlyPattern = '(?:\\d[\\d,]*(?:\\.\\d+)?)(?!\\d)';

export function extractAmounts(text: string): number[] {
  const normalized = normalizeDigits(text);
  const values: number[] = [];
  const re = new RegExp(`${moneyPattern}`, 'gi');
  for (const match of normalized.matchAll(re)) {
    const raw = match[0].trim();
    if (!/\d/.test(raw)) continue;
    const index = match.index ?? 0;
    const after = normalized.slice(index + match[0].length);
    // Percentages are discounts/rates, not rupee amounts.
    if (/^\s*(?:%|टक्के)/i.test(after)) continue;
    const number = Number((raw.match(/\d[\d,]*(?:\.\d+)?/)?.[0] ?? '').replace(/,/g, ''));
    if (Number.isFinite(number) && number > 0) values.push(number);
  }
  return values;
}

export function extractAmount(text: string): number | null {
  const values = extractAmounts(text);
  if (values.length) return values[0];
  return parseWordNumber(normalizeDigits(text).replace(/[,.!?।]/g, ' '));
}

function hasAny(text: string, patterns: string[]) {
  return patterns.some(pattern => new RegExp(pattern, 'i').test(text));
}

function inferType(text: string): TransactionType | null {
  const t = normalizeAppVocabulary(text);
  if (hasAny(t, ['transfer','हस्तांतरण','हस्तांतर','एका खात्यातून','एका अकाउंटमधून','दुसऱ्या खात्यात','पैसे हलव'])) return 'Transfer';
  if (hasAny(t, ['expense','खर्च','खरेदी','विकत घेतले','विकत घेतला','विकत घेतली','पेमेंट','payment','दिला','दिली','भरले','भरला','पैसे गेले','काढले'])) return 'Expense';
  if (hasAny(t, ['income','उत्पन्न','मिळाले','मिळालं','आले','आलं','जमा','विक्री','विकला','विकले','विकली','sales','sale','sold','पैसे आले','पैसे मिळाले','paise mile','रुपये आले','रोख मिळाली','receipt','payment received'])) return 'Income';
  if (hasAny(t, ['बचत','सेव्हिंग','savings','pigmy','आरडी','rd','fd','ठेव'])) return 'Savings';
  return null;
}

function inferAccount(text: string, bankAccounts: Array<{id:string;bankName:string;accountType:string;upiId?:string}>) {
  const t = normalizeAppVocabulary(text);
  if (/(cash\s*in\s*hand|cash हातात|कॅश\s*इन\s*हँड|कॅश\s*इन\s*हॅन्ड|हातातील रोख|घरची रोख|घरचा कॅश|हातातले पैसे|हातातील पैसे)/i.test(t)) return CASH_IN_HAND_ID;
  if (/(galla|गल्ला|cash box|दुकानचा कॅश|दुकानातील रोख|दुकानचा गल्ला|कॅशमध्ये|कॅश मधून|रोख मधून)/i.test(t)) return GALLA_ID;
  const bank = bankAccounts.find(a => t.includes(a.bankName.toLowerCase()) || (a.upiId && t.includes(a.upiId.toLowerCase())));
  return bank?.id ?? null;
}

function inferCategory(text: string, type: TransactionType) {
  const t = normalizeAppVocabulary(text);
  if(type === 'Transfer') return 'Transfer';
  if(type === 'Savings') return 'Savings';
  if(type === 'Income' && /(विक्री|sale|sales|sold)/i.test(t)) return 'Sales';
  if(/(purchase|बटाटा|भाजी|भाजीपाला|vegetable|potato|ब्लुटूथ|bluetooth|मोबाईल|mobile|सामान|माल|पेन|पुस्तक|कॅम्पस)/i.test(t)) return 'Purchase';
  if(/(पेट्रोल|डिझेल|fuel|petrol|diesel)/i.test(t)) return 'Fuel';
  if(/(पगार|salary)/i.test(t)) return 'Salary';
  if(/(भाडे|rent)/i.test(t)) return 'Rent';
  if(/(वीज|लाईट|electricity|light bill)/i.test(t)) return 'Electricity';
  if(/(जेवण|खाणे|food|हॉटेल|hotel)/i.test(t)) return 'Food';
  return type === 'Expense' ? 'General Expense' : 'General';
}

/**
 * Classify without executing. This is deliberately conservative: bill/sale
 * is checked before generic income/expense because natural sales sentences
 * often contain words such as "खरेदी", "दिले" and several amounts.
 */
export function classifyAssistantIntent(text: string): AssistantIntentName {
  const t = normalizeAppVocabulary(text);
  if (looksLikeNavigation(text)) return 'NAVIGATION';
  if (looksLikeInvoice(text)) return 'CREATE_BILL';
  if (hasAny(t, ['customer','ग्राहक','party','पार्टी']) && hasAny(t, ['add','create','new','जोड','नवीन','नोंदवा'])) return 'ADD_CUSTOMER';
  if (hasAny(t, ['inventory','item','product','stock']) && hasAny(t, ['add','create','new','जोड','नवीन','घाला','टाका'])) return 'ADD_ITEM';
  if (hasAny(t, ['balance','शिल्लक','balance kiti','account balance','net worth','networth','निव्वळ संपत्ती'])) return 'CHECK_BALANCE';
  if (hasAny(t, ['report','अहवाल','हिशोब','sales','विक्री','profit','loss','नफा','तोटा'])) return 'REPORT';
  const type = inferType(text);
  if (type === 'Income') return 'ADD_INCOME';
  if (type === 'Expense') return 'ADD_EXPENSE';
  if (type === 'Transfer') return 'MONEY_TRANSFER';
  return 'UNKNOWN';
}

export function extractCustomerName(text:string): string | null {
  const patterns = [
    /^(?:आज\s*)?(.+?)(?:\s*ने|\s*यांनी)\s+/i,
    /(?:ग्राहक|customer|client|कस्टमर|party|पार्टी)\s*[:\-]?\s*(.+?)(?=\s+(?:ने|यांनी|bought|purchased|purchase|sold|sale|चा|ची|चे|चे bill|चे invoice)\b|$)/i,
    /^(.+?)\s+(?:चे|चा|ची)\s+(?:bill|invoice|बिल|इनव्हॉइस)\b/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const name = m[1]
        .replace(/^(आज|काल|आत्ता|please|pls)\s+/i, '')
        .replace(/[,:;]+$/, '')
        .trim();
      if (name && name.length > 1 && !/^(मला|please|pls|show|दाखवा)$/i.test(name)) return name;
    }
  }
  return null;
}

const stripCommandWords = (value: string) => value
  .replace(/(?:आज|काल|आत्ता|please|pls)\b/gi, ' ')
  .replace(/(?:\s+यांनी|\s+ने)(?=\s+)/gi, ' ')
  .replace(/(?:\s+बिल|\s+इनव्हॉइस|\s+invoice|\s+bill|\s+तयार|\s+करा|\s+केला|\s+केली|\s+केले|\s+दिला|\s+दिली|\s+दिलं|\s+दिले|\s+खरेदी|\s+खरेदीचा|\s+खरेदीचे|\s+खरेदीची|\s+purchase|\s+purchased|\s+विक्री|\s+sale|\s+sold|\s+विकत|\s+घेतला|\s+घेतली|\s+घेतले|\s+त्याला|\s+त्याचे|\s+त्याची|\s+त्याचे बिल)(?=\s|$)/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function cleanItemName(value: string): string {
  return value
    .replace(/^(?:आणि|and)\s+/i, '')
    .replace(/(?:आणि|and|करा|केला|केली|केले|दिला|दिली)$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,;\s]+|[,;.\s]+$/g, '')
    .trim();
}

export function extractInvoiceItems(text: string, customer: string | null = extractCustomerName(text)): Array<{name:string; price:number; quantity:number}> {
  let s = stripCommandWords(text);
  if (customer) s = s.replace(customer, ' ');
  // Stop before discount/payment clauses so their numbers (e.g. 10%) never
  // become invoice items.
  s = s.split(/(?:\d+(?:\.\d+)?\s*(?:%|टक्के)\s*(?:discount|डिस्काऊंट|डिस्काउंट|सूट|सवलत)|discount|डिस्काऊंट|डिस्काउंट|सूट|सवलत|payment|पेमेंट|upi|यूपीआय|phonepe|gpay|google pay|paytm|cash|रोख|credit|pending|बाकी|बिल जमा)/i)[0];
  if (!/(?:\b(?:bill|invoice|sale|sold|purchase|purchased)\b|बिल|इनव्हॉइस|विक्री|विकले|विकला|खरेदी|घेतले|विकत|\s(?:रुपयांचे|रुपयांचा|रुपयांची|रुपयाचे|रुपायांचे|रुपायांचा|रुपायांची|रुपायाचे)\s)/i.test(text) && extractAmounts(text).length < 2) return [];

  const items: Array<{name:string; price:number; quantity:number}> = [];
  const seen = new Set<string>();
  const add = (name: string, price: number, quantity = 1) => {
    const clean = cleanItemName(name)
      .replace(/^(?:रुपयांचे|रुपयांचा|रुपयांची|रुपयाचे|रुपायांचे|रुपायांचा|रुपायांची|रुपायाचे)\s+/i, '')
      .trim();
    if (!clean || !Number.isFinite(price) || price <= 0) return;
    const key = `${clean.toLowerCase()}|${price}|${quantity}`;
    if (!seen.has(key)) { seen.add(key); items.push({ name: clean, price, quantity: Math.max(1, quantity) }); }
  };

  const marathiMoneySuffix = '(?:रुपयांचे|रुपयांचा|रुपयांची|रुपयाचे|रुपायांचे|रुपायांचा|रुपायांची|रुपायाचे|रुपये|रुपया|रुपाय|रुपय)(?![\u0900-\u097F])';
  const explicitMoneyPattern = `(?:₹|rs\\.?|inr\\.?|रु\\.?)\\s*${numberOnlyPattern}`;

  // 1) Amount + Marathi money word + item. This is the most common Marathi
  // voice form: "20 रुपयांचे पेन 100 रुपयांचे पुस्तक".
  const amountFirstMarathi = new RegExp(`(${numberOnlyPattern})\\s*${marathiMoneySuffix}\\s*([^,;]+?)(?=\\s+${numberOnlyPattern}\\s*${marathiMoneySuffix}|[,;]|$)`, 'gi');
  for (const m of s.matchAll(amountFirstMarathi)) add(m[2], Number(m[1].replace(/,/g, '')), 1);
  if (items.length) return items;

  // 2) Explicit currency/amount + item: "₹20 pen", "Rs 100 book".
  const amountFirstExplicit = new RegExp(`(${explicitMoneyPattern})\\s*(?:of\\s*)?([^,;]+?)(?=\\s+${explicitMoneyPattern}|[,;]|$)`, 'gi');
  for (const m of s.matchAll(amountFirstExplicit)) add(m[2], extractAmount(m[1]) ?? 0, 1);
  if (items.length) return items;

  // 3) Quantity + item + amount, but only when the first number is NOT
  // immediately followed by a Marathi money word. This prevents "20 रुपयांचे
  // पेन" from being read as quantity=20.
  const qtyFirst = new RegExp(`(${numberOnlyPattern})\\s+(?!(?:${marathiMoneySuffix})\\b)([^,;]+?)\\s+(${moneyPattern})(?=\\s|[,;]|$)`, 'gi');
  for (const m of s.matchAll(qtyFirst)) add(m[2], extractAmount(m[3]) ?? 0, Number(m[1].replace(/,/g, '')));
  if (items.length) return items;

  // 4) Item + amount: "pen 20 रुपये, book 100 रुपये".
  const itemFirst = new RegExp(`([^,;]+?)\\s+(${moneyPattern})(?=\\s|[,;]|$)`, 'gi');
  for (const m of s.matchAll(itemFirst)) add(m[1], extractAmount(m[2]) ?? 0, 1);
  if (items.length) return items;

  return items;
}

export function extractDiscount(text: string): number {
  const m = text.match(/(?:discount|डिस्काऊंट|डिस्काउंट|सूट|सवलत)\s*(?:of|चा|ची|चे|ने)?\s*(\d+(?:\.\d+)?)\s*%/i)
    || text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:discount|डिस्काऊंट|डिस्काउंट|सूट|सवलत)/i)
    || text.match(/(\d+(?:\.\d+)?)\s*(?:टक्के|टक्के\sचा|टक्के\sची|टक्के\sचे)\s*(?:discount|डिस्काऊंट|डिस्काउंट|सूट|सवलत)/i);
  return m ? Number(m[1]) : 0;
}

export function extractPaymentMethod(text: string): 'Cash'|'UPI'|'Card'|'Bank Transfer'|'Cheque'|'Credit/Pending' {
  const t = normalizeAppVocabulary(text);
  if (/(upi|यूपीआय|फोनपे|phonepe|gpay|google pay|paytm)/i.test(t)) return 'UPI';
  if (/(card|डेबिट कार्ड|क्रेडिट कार्ड)/i.test(t)) return 'Card';
  if (/(bank transfer|बँक ट्रान्सफर|नेफ्ट|neft|rtgs|imps)/i.test(t)) return 'Bank Transfer';
  if (/(cheque|चेक)/i.test(t)) return 'Cheque';
  if (/(उधार|उधारी|pending|credit|बाकी)/i.test(t)) return 'Credit/Pending';
  return 'Cash';
}

export function looksLikeInvoice(text:string) {
  const t = normalizeAppVocabulary(text);
  const amounts = extractAmounts(text);
  const multipleAmounts = amounts.length >= 2;
  const hasInvoiceKeyword = hasAny(t, ['bill','invoice','विक्री','sale','sales','विकले','विकला','purchase','purchased','sold','discount','सवलत']);
  const hasBillVerb = hasAny(t, ['bill bana','बिल बनवा','बिल बनव','invoice create','invoice बनवा','sale entry','sale करा','पावती तयार','generate bill','generate invoice','बिल तयार','इनव्हॉइस तयार']);
  const hasPerson = hasAny(t, ['यांनी','ने','ग्राहक','customer','client','कस्टमर','party','पार्टी','ला','साठी']);
  const hasPayment = hasAny(t, ['upi','यूपीआय','payment','पेमेंट','paid','cash','रोख','credit','उधारी','pending','बाकी']);
  const hasPurchaseOrSaleVerb = hasAny(t, ['खरेदी','purchase','purchased','विक्री','sale','sold','विकले','विकला']);
  const parsedItems = extractInvoiceItems(text);
  return (amounts.length > 0 && (
    hasBillVerb ||
    (hasPerson && (hasInvoiceKeyword || (multipleAmounts && (hasPayment || hasPurchaseOrSaleVerb)))) ||
    (parsedItems.length >= 2 && (hasPurchaseOrSaleVerb || hasPayment))
  ));
}

export function extractEntities(text: string): AssistantEntities {
  const items = extractInvoiceItems(text);
  return {
    amount: extractAmount(text),
    amounts: extractAmounts(text),
    customerName: extractCustomerName(text),
    itemName: items[0]?.name ?? null,
    itemNames: items.map(item => item.name),
    quantities: items.map(item => item.quantity),
  };
}

export function looksLikeNavigation(text: string): boolean {
  const t = normalizeAppVocabulary(text);
  return hasAny(t, ['open','page','home','transactions page','banking page','inventory page','cash page','ledger page','reports page','settings page','pos page','invoice page','sales history page','menu page'])
    && hasAny(t, ['open','navigate','go to','उघड','ओपन','जा','page','पेज','पान','स्क्रीन']);
}

export function getAssistantValidationMessage(text: string, language: 'mr' | 'en' = 'mr'): string | null {
  const value = text.trim();
  if (!value) return language === 'mr' ? 'कृपया command सांगा.' : 'Please enter a command.';
  const normalized = normalizeAppVocabulary(value);
  const amount = extractAmount(value);
  const type = inferType(value);
  const intent = classifyAssistantIntent(value);
  if (intent === 'CREATE_BILL' && (!amount || amount <= 0)) {
    return language === 'mr' ? 'बिल तयार करण्यासाठी ग्राहक, वस्तू आणि रक्कम स्पष्ट सांगा. उदाहरण: “अमोलला ₹500 चे पेन विकले, बिल UPI ने जमा झाले.”' : 'To create a bill, tell me the customer, item and amount.';
  }
  const isExpense = type === 'Expense' || /(खर्च|expense|खरेदी|विकत)/i.test(normalized);
  const isIncome = type === 'Income' || /(उत्पन्न|income|विक्री|sale|मिळाले|जमा)/i.test(normalized);
  const isTransfer = type === 'Transfer' || /(transfer|ट्रान्सफर|हस्तांतरण|पैसे हलव)/i.test(normalized);
  const isSavings = type === 'Savings' || /(बचत|सेव्हिंग|savings|pigmy|आरडी|fd|ठेव)/i.test(normalized);
  if ((isExpense || isIncome || isTransfer || isSavings) && (!amount || amount <= 0)) {
    if (isExpense) return language === 'mr' ? 'खर्चाची नोंद अपुरी आहे. स्पष्ट सांगा: कशासाठी खर्च झाला आणि किती रुपये खर्च झाले. उदाहरण: “आज पेट्रोलसाठी ₹500 खर्च झाले.”' : 'The expense is incomplete. Tell me what it was for and how much it was.';
    return language === 'mr' ? 'कृपया किती रुपये आहेत ते स्पष्ट सांगा.' : 'Please specify the amount clearly.';
  }
  if (isExpense) {
    let purpose = value.replace(new RegExp(moneyPattern, 'gi'), ' ');
    purpose = purpose.replace(/आज|काल|आत्ता|खर्च|expense|झाला|झाले|झाली|झालं|केला|केली|केले|करण्यासाठी|रक्कम|पैसे/gi, ' ').replace(/[.,!?।]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!purpose) return language === 'mr' ? 'कशासाठी खर्च झाला ते स्पष्ट सांगा. उदाहरण: “आज स्टेशनरीसाठी ₹300 खर्च झाले.”' : 'Tell me what the expense was for.';
  }
  if (isTransfer && !/(मधून|पासून|to|मध्ये|खात्यात|account|galla|गल्ला|cash|बँक|bank)/i.test(normalized)) return language === 'mr' ? 'Transfer साठी पैसे कुठून आणि कुठे गेले ते स्पष्ट सांगा. उदाहरण: “Galla मधून ₹2000 Cash in Hand मध्ये transfer केले.”' : 'For a transfer, tell me the source and destination.';
  return null;
}

export function parseAssistantCommand(
  text:string,
  bankAccounts:Array<{id:string;bankName:string;accountType:string;upiId?:string}>,
  inventoryItems: InventoryItem[] = [],
): AssistantIntent | null {
  const amount = extractAmount(text);
  const intent = classifyAssistantIntent(text);

  if (intent === 'CREATE_BILL' || looksLikeInvoice(text)) {
    const customer = extractCustomerName(text) ?? 'Walk-in Customer';
    const parsedItems = extractInvoiceItems(text, customer);
    const items = parsedItems.length ? parsedItems : [{name:'Item', price:amount ?? 0, quantity:1}];
    const discountPercent = extractDiscount(text);
    const paymentMethod = extractPaymentMethod(text);
    const paymentAccount = paymentMethod === 'UPI' ? bankAccounts.find(a => a.upiId) : undefined;
    const now = new Date().toISOString();
    const cart: CartItem[] = items.map((entry, index) => {
      const entryName = entry.name.toLowerCase();
      const found = inventoryItems.find(i => {
        const name = i.name.toLowerCase();
        return name === entryName || name.includes(entryName) || entryName.includes(name);
      });
      const product: POSProduct = found
        ? {id:found.id,name:found.name,price:entry.price,category:found.category,unit:found.unit,stock:found.stock,showOnPOS:found.showOnPOS,emoji:'📦',photoUrl:found.photoUrl}
        : {id:`ai-product-${Date.now()}-${index}`,name:entry.name,price:entry.price,category:'General',unit:'pcs',stock:0,showOnPOS:true,emoji:'📦'};
      return {product,quantity:entry.quantity,inventoryItemId:found?.id ?? null,taxRate:found?.taxRate ?? 0,taxAmount:0,lineAmount:entry.price*entry.quantity,discountMode:'percentage',discountValue:0};
    });
    const subtotal = cart.reduce((sum, line) => sum + Number(line.lineAmount || line.quantity * line.product.price), 0);
    const discount = subtotal * Math.max(0, discountPercent) / 100;
    const total = Math.max(0, subtotal - discount);
    const invoiceId = `ai-${Date.now()}`;
    return {
      kind:'invoice',
      customerName:customer,
      itemName:cart.map(c=>c.product.name).join(', '),
      invoice:{
        id:invoiceId,
        invoiceNumber:`AI-${Date.now().toString().slice(-6)}`,
        items:cart,
        subtotal,
        discount,
        total,
        paymentMethod,
        date:new Date().toISOString().slice(0,10),
        createdAt:now,
        customerName:customer,
        customerPhone:'',
        customerAddress:'',
        taxMode:'percentage',
        taxValue:0,
        taxAmount:0,
        discountMode:'percentage',
        discountValue:discountPercent,
        roundOff:false,
        roundOffAmount:0,
        paymentStatus:paymentMethod==='Credit/Pending'?'Pending':'Paid',
        balanceDue:paymentMethod==='Credit/Pending'?total:0,
        terms:'',
        signatureEnabled:true,
        upiAccountId:paymentAccount?.id ?? null,
        paymentAccountId:paymentAccount?.id ?? null,
        transactionId:null,
        description:`AI created bill for ${cart.map(c=>c.product.name).join(', ')}`,
      },
    };
  }

  if (!amount || amount <= 0) return null;
  const type = inferType(text);
  if (!type) return null;
  const account = inferAccount(text,bankAccounts);
  const today = new Date().toISOString().slice(0,10);
  const source = account ?? (type==='Income' ? GALLA_ID : CASH_IN_HAND_ID);
  const description = type==='Income' && /(विक्री|sale|sales|sold)/i.test(normalizeAppVocabulary(text)) ? 'विक्री' : text.trim();
  if(type==='Transfer') {
    const matches=bankAccounts.filter(a=>text.toLowerCase().includes(a.bankName.toLowerCase()));
    const dest=matches.find(a=>a.id!==source)?.id??CASH_IN_HAND_ID;
    return {kind:'transaction',type,amount,category:'Transfer',description,date:today,tag:'Shop / Business',sourceAccountId:source,destAccountId:dest,isFromGalla:source===GALLA_ID};
  }
  return {kind:'transaction',type,amount,category:inferCategory(text,type),description,date:today,tag:'Shop / Business',sourceAccountId:source,destAccountId:null,isFromGalla:source===GALLA_ID};
}
