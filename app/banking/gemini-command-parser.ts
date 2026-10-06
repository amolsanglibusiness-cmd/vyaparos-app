'use client';

import type { Invoice, CartItem, POSProduct, InventoryItem, Transaction } from './types';
import { GALLA_ID, CASH_IN_HAND_ID } from './mock-data';
import { resolveMoneyAccount } from './ai-finance-rules';
import { supabase } from '@/lib/supabase';

export type GeminiCommandResult = {
  intent: 'ADD_TRANSACTION' | 'ADD_CUSTOMER' | 'CREATE_BILL' | 'CHECK_BALANCE' | 'SEND_WHATSAPP' | 'UNKNOWN';
  route: 'APP' | 'GENERAL';
  normalized_command: string | null;
  answer: string | null;
  party_name: string | null;
  amount: number | null;
  type: 'credit' | 'debit' | 'jama' | 'kharch' | null;
  note: string | null;
  payment_method: string | null;
  discount_percent: number | null;
  items: Array<{ name: string; quantity: number; amount: number }>;
};

export type GeminiCommandResponse = {
  result: GeminiCommandResult | null;
  error: string | null;
  code?: string;
};

export type GeminiHealthResponse = {
  ok: boolean;
  configured: boolean;
  model: string;
  error?: string;
};

export interface GeminiCallResult {
  result: {
    route?: 'APP' | 'GENERAL';
    normalized_command?: string;
    answer?: string;
    confidence?: number;
  } | null;
  error: string | null;
  rateLimited: boolean;
}

async function functionError(error: any) {
  let payload: any = null;
  if (error?.context instanceof Response) {
    payload = await error.context.clone().json().catch(() => null);
  }
  return {
    message: payload?.error || error?.message || 'Gemini Edge Function request failed.',
    code: payload?.code,
    status: Number(error?.context?.status || 0),
  };
}

function extractJson(text: string): any | null {
  const cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const candidates = [cleaned];
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) candidates.push(cleaned.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
  }
  return null;
}

function validateGeminiResult(value: unknown): GeminiCommandResult | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const intents = ['ADD_TRANSACTION', 'ADD_CUSTOMER', 'CREATE_BILL', 'CHECK_BALANCE', 'SEND_WHATSAPP', 'UNKNOWN'];
  if (!intents.includes(String(row.intent))) return null;

  const route = row.route === 'GENERAL' ? 'GENERAL' : 'APP';
  const items = Array.isArray(row.items)
    ? row.items.map((item) => {
        const r = item as Record<string, unknown>;
        return {
          name: String(r?.name || '').trim(),
          quantity: Number(r?.quantity || 0),
          amount: Number(r?.amount || 0),
        };
      }).filter((item) =>
        item.name &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.amount) &&
        item.amount > 0
      )
    : [];

  const amount = row.amount == null ? null : Number(row.amount);
  const discount = row.discount_percent == null ? null : Number(row.discount_percent);
  const type = row.type == null ? null : String(row.type).toLowerCase() as GeminiCommandResult['type'];

  if (amount != null && (!Number.isFinite(amount) || amount <= 0 || amount > 100000000)) return null;
  if (discount != null && (!Number.isFinite(discount) || discount < 0 || discount > 100)) return null;
  if (type && !['credit', 'debit', 'jama', 'kharch'].includes(type)) return null;

  return {
    intent: row.intent as GeminiCommandResult['intent'],
    route,
    normalized_command: typeof row.normalized_command === 'string' ? row.normalized_command.trim() || null : null,
    answer: typeof row.answer === 'string' ? row.answer.trim() || null : null,
    party_name: typeof row.party_name === 'string' ? row.party_name.trim() || null : null,
    amount: amount && amount > 0 ? amount : null,
    type,
    note: typeof row.note === 'string' ? row.note.trim() || null : null,
    payment_method: typeof row.payment_method === 'string' ? row.payment_method.trim() || null : null,
    discount_percent: discount,
    items,
  };
}

export async function checkGeminiConnection(): Promise<GeminiHealthResponse> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { ok: false, configured: false, model: '', error: 'AUTH_REQUIRED' };
    }

    const { data, error } = await supabase.functions.invoke('vyaparos-gemini', {
      body: { action: 'health' },
    });

    if (error) {
      const e = await functionError(error);
      return { ok: false, configured: false, model: '', error: e.message };
    }

    return {
      ok: Boolean(data?.ok),
      configured: Boolean(data?.configured),
      model: data?.model || '',
      error: data?.error,
    };
  } catch (e) {
    return {
      ok: false,
      configured: false,
      model: '',
      error: e instanceof Error ? e.message : 'Gemini health check failed.',
    };
  }
}

export async function askGeminiCommandDetailed(text: string): Promise<GeminiCommandResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('vyaparos-gemini', {
      body: { text },
    });

    if (error) {
      const e = await functionError(error);
      return { result: null, error: e.message, code: e.code };
    }

    if (!data?.ok || !data.result) {
      return {
        result: null,
        error: data?.error || 'Gemini did not return a result.',
        code: data?.code,
      };
    }

    return {
      result: validateGeminiResult(data.result),
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : 'Gemini request failed.',
    };
  }
}

/**
 * Backward-compatible API used by the current AI Assistant page.
 * It asks Gemini to normalize a command into the existing local command syntax.
 */
export async function askGeminiCommand(command: string): Promise<GeminiCallResult> {
  const detailed = await askGeminiCommandDetailed(command);

  if (detailed.error || !detailed.result) {
    return {
      result: null,
      error: detailed.error,
      rateLimited: detailed.code === 'RATE_LIMITED' || /429|rate.?limit|quota/i.test(detailed.error || ''),
    };
  }

  const result = detailed.result;
  return {
    result: {
      route: result.route,
      normalized_command: result.normalized_command || undefined,
      answer: result.answer || undefined,
    },
    error: null,
    rateLimited: false,
  };
}

export async function teachGeminiCommand(
  phrase: string,
  explanation: string,
): Promise<{ canonicalCommand: string | null; error: string | null }> {
  const prompt = `
You are teaching the VyaparOS command interpreter a new user shortcut.
Convert the user's explanation into ONE existing VyaparOS canonical command.
Do not invent a new app capability.
Return ONLY JSON:
{"route":"APP","normalized_command":"...","answer":null}

New phrase: ${JSON.stringify(phrase)}
Meaning: ${JSON.stringify(explanation)}
`;

  const response = await supabase.functions.invoke('vyaparos-gemini', {
    body: { text: prompt },
  });

  if (response.error) {
    const e = await functionError(response.error);
    return { canonicalCommand: null, error: e.message };
  }

  const result = validateGeminiResult(response.data?.result);
  if (result?.normalized_command) {
    return { canonicalCommand: result.normalized_command, error: null };
  }

  // Some older Edge Function versions return normalized_command directly.
  const raw = response.data?.result || response.data?.text;
  if (typeof raw === 'string') {
    const parsed = extractJson(raw);
    if (typeof parsed?.normalized_command === 'string') {
      return { canonicalCommand: parsed.normalized_command, error: null };
    }
  }

  return {
    canonicalCommand: null,
    error: response.data?.error || 'Gemini did not return a canonical command.',
  };
}

function paymentMethod(value: string | null): Invoice['paymentMethod'] {
  const t = (value || '').toLowerCase();
  if (t.includes('upi') || t.includes('phonepe') || t.includes('gpay') || t.includes('google pay') || t.includes('paytm')) return 'UPI';
  if (t.includes('card')) return 'Card';
  if (t.includes('bank') || t.includes('neft') || t.includes('rtgs') || t.includes('imps')) return 'Bank Transfer';
  if (t.includes('cheque') || t.includes('check')) return 'Cheque';
  if (t.includes('credit') || t.includes('pending') || t.includes('उधार') || t.includes('बाकी')) return 'Credit/Pending';
  return 'Cash';
}

export function buildGeminiInvoice(
  result: GeminiCommandResult,
  inventoryItems: InventoryItem[],
): { kind: 'invoice'; invoice: Invoice; customerName: string; itemName: string } | null {
  if (result.intent !== 'CREATE_BILL' || result.items.length === 0) return null;

  const customerName = result.party_name || 'Walk-in Customer';

  const cart: CartItem[] = result.items.map((entry, index) => {
    const found = inventoryItems.find((item) => {
      const a = item.name.toLowerCase();
      const b = entry.name.toLowerCase();
      return a === b || a.includes(b) || b.includes(a);
    });

    const product: POSProduct = found
      ? {
          id: found.id,
          name: found.name,
          price: entry.amount,
          category: found.category,
          unit: found.unit,
          stock: found.stock,
          showOnPOS: found.showOnPOS,
          emoji: '📦',
          photoUrl: found.photoUrl,
        }
      : {
          id: `gemini-product-${Date.now()}-${index}`,
          name: entry.name,
          price: entry.amount,
          category: 'General',
          unit: 'pcs',
          stock: 0,
          showOnPOS: true,
          emoji: '📦',
        };

    return {
      product,
      quantity: entry.quantity,
      inventoryItemId: found?.id ?? null,
      taxRate: found?.taxRate ?? 0,
      taxAmount: 0,
      lineAmount: entry.amount * entry.quantity,
      discountMode: 'percentage',
      discountValue: 0,
    };
  });

  const subtotal = cart.reduce((sum, line) => sum + Number(line.lineAmount || 0), 0);
  const discountPercent = Math.max(0, Math.min(100, Number(result.discount_percent || 0)));
  const discount = subtotal * discountPercent / 100;
  const total = Math.max(0, subtotal - discount);
  const method = paymentMethod(result.payment_method);
  const now = new Date().toISOString();

  const invoice: Invoice = {
    id: `gemini-${Date.now()}`,
    invoiceNumber: `AI-${Date.now().toString().slice(-6)}`,
    items: cart,
    subtotal,
    discount,
    total,
    paymentMethod: method,
    date: now.slice(0, 10),
    createdAt: now,
    customerName,
    customerPhone: '',
    customerAddress: '',
    taxMode: 'percentage',
    taxValue: 0,
    taxAmount: 0,
    discountMode: 'percentage',
    discountValue: discountPercent,
    roundOff: false,
    roundOffAmount: 0,
    paymentStatus: method === 'Credit/Pending' ? 'Pending' : 'Paid',
    balanceDue: method === 'Credit/Pending' ? total : 0,
    terms: '',
    signatureEnabled: true,
    upiAccountId: null,
    paymentAccountId: null,
    transactionId: null,
    description: result.note || `AI created bill for ${cart.map((item) => item.product.name).join(', ')}`,
  };

  return {
    kind: 'invoice',
    invoice,
    customerName,
    itemName: cart.map((item) => item.product.name).join(', '),
  };
}

export function buildGeminiTransaction(
  result: GeminiCommandResult,
  bankAccounts: Array<{ id: string; bankName: string; accountType: string; upiId?: string }>,
): Omit<Transaction, 'id' | 'createdAt'> & { kind: 'transaction' } | null {
  if (result.intent !== 'ADD_TRANSACTION' || !result.amount) return null;

  const isIncome = result.type === 'credit' || result.type === 'jama';
  const type = isIncome ? 'Income' : 'Expense';
  const sourceText = `${result.note || ''} ${result.party_name || ''}`.trim();
  const resolution = resolveMoneyAccount(sourceText, bankAccounts, isIncome);
  const sourceAccountId = resolution.ok ? resolution.accountId : (isIncome ? GALLA_ID : CASH_IN_HAND_ID);

  return {
    kind: 'transaction',
    type,
    amount: result.amount,
    category: isIncome ? 'General' : 'General Expense',
    description: result.note || (result.party_name ? `${type} — ${result.party_name}` : type),
    date: new Date().toISOString().slice(0, 10),
    tag: 'Shop / Business',
    sourceAccountId,
    destAccountId: null,
    isFromGalla: sourceAccountId === GALLA_ID,
  };
}

export function geminiTransactionText(result: GeminiCommandResult): string | null {
  if (result.intent !== 'ADD_TRANSACTION' || !result.amount) return null;
  const type = result.type === 'credit' || result.type === 'jama' ? 'income' : 'expense';
  return `${result.party_name ? `${result.party_name} ` : ''}${type} ₹${result.amount}${result.note ? ` ${result.note}` : ''}`;
}

export function geminiInvoiceText(result: GeminiCommandResult): string | null {
  if (result.intent !== 'CREATE_BILL' || result.items.length === 0) return null;
  const customer = result.party_name ? `${result.party_name} ने ` : '';
  const items = result.items
    .map((item) => `${item.quantity > 1 ? `${item.quantity} ` : ''}${item.name} ${item.amount} रुपये`)
    .join(', ');
  const discount = result.discount_percent != null && result.discount_percent > 0
    ? ` ${result.discount_percent}% डिस्काउंट`
    : '';
  const payment = result.payment_method ? ` ${result.payment_method} ने जमा झाले` : '';
  return `${customer}${items}${discount}${payment}`;
}
