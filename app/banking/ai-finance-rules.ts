import { GALLA_ID, CASH_IN_HAND_ID } from './mock-data';

type BankLike = {
  id: string;
  bankName: string;
  accountType?: string;
  accountNumber?: string;
  upiId?: string;
};

export type MoneyAccountResolution =
  | { ok: true; accountId: string; label: string; kind: 'bank' | 'galla' | 'cash-in-hand' }
  | { ok: false; reason: 'NO_BANK' | 'AMBIGUOUS_BANK' | 'BANK_NOT_FOUND'; options: BankLike[]; requestedBank?: string };

const BANK_WORDS = [
  'bank', 'बँक', 'बैंक', 'account', 'अकाउंट', 'खाते', 'खात्यातून', 'खात्यात',
  'बँकेतून', 'बँकेत', 'बँक मधून', 'बँक मधे', 'bank मधून', 'bank मधे', 'bank account',
];

const GALLA_WORDS = ['galla', 'गल्ला', 'गल्ल्यातून', 'गल्ल्यात', 'cash box', 'दुकानचा cash', 'दुकानचा कॅश'];
const CASH_WORDS = ['cash in hand', 'कॅश इन हँड', 'हातातील रोख', 'हातातले cash', 'घरची रोख', 'home cash'];

// Common bank aliases make "HDFC Bank", "HDFC", "HDFC बँक" equivalent.
const KNOWN_BANK_ALIASES = [
  'hdfc', 'sbi', 'state bank of india', 'state bank', 'icici', 'axis', 'kotak', 'kotak mahindra',
  'yes bank', 'bank of baroda', 'bob', 'canara', 'union bank', 'idfc', 'idfc first', 'indusind',
  'punjab national bank', 'pnb', 'bank of india', 'central bank', 'indian bank', 'uco bank',
  'federal bank', 'rbl bank', 'bandhan bank', 'au small finance bank', 'fincare', 'equitas',
  'south indian bank', 'karnataka bank', 'idbi', 'bank of maharashtra', 'maharashtra bank',
];

function norm(value: string) {
  return value
    .toLowerCase()
    .replace(/[?？!।,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactBankName(value: string) {
  return norm(value)
    .replace(/\b(bank|banks|बँक|बैंक|ltd|limited|लिमिटेड|account|अकाउंट|खाते)\b/g, ' ')
    .replace(/[^a-z0-9\u0900-\u097f]/gi, '')
    .trim();
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function accountMentioned(text: string, account: BankLike) {
  const bankName = norm(account.bankName || '');
  const compactName = compactBankName(account.bankName || '');
  const upi = norm(account.upiId || '');
  const accountLast4 = (account.accountNumber || '').replace(/\D/g, '').slice(-4);
  const compactText = compactBankName(text);

  return Boolean(
    (bankName && text.includes(bankName)) ||
    (compactName && compactText.includes(compactName)) ||
    (upi && text.includes(upi)) ||
    (accountLast4 && new RegExp(`(?:${accountLast4})\\b`).test(text))
  );
}

function requestedBankName(text: string) {
  const lower = norm(text);
  // Prefer a known bank alias when the user explicitly names one.
  const known = KNOWN_BANK_ALIASES
    .filter((name) => lower.includes(name))
    .sort((a, b) => b.length - a.length)[0];
  if (known) return known;

  // Also recognize arbitrary names immediately before/after the word bank/बँक.
  const match = lower.match(/([a-z][a-z0-9 .&'-]{1,40})\s+(?:bank|बँक|बैंक)\b/i)
    || lower.match(/\b(?:bank|बँक|बैंक)\s+([a-z][a-z0-9 .&'-]{1,40})/i);
  return match?.[1]?.trim() || '';
}

export function hasExplicitBankReference(command: string) {
  const text = norm(command);
  return containsAny(text, BANK_WORDS) || Boolean(requestedBankName(text)) || /\b(?:hdfc|sbi|icici|axis|kotak|yes|idfc|pnb|bob|canara|union)\b/i.test(text);
}

/**
 * Resolve the money source/destination for every AI-created financial entry.
 * If a specific bank is named, it MUST match a saved account; never silently
 * fall back to another bank, Galla, or Cash in Hand.
 */
export function resolveMoneyAccount(command: string, bankAccounts: BankLike[], income: boolean): MoneyAccountResolution {
  const text = norm(command);
  const explicitGalla = containsAny(text, GALLA_WORDS);
  const explicitCash = containsAny(text, CASH_WORDS);
  const namedBank = requestedBankName(text);
  const explicitBank = hasExplicitBankReference(text) || bankAccounts.some((a) => accountMentioned(text, a));

  if (explicitGalla && !explicitBank) return { ok: true, accountId: GALLA_ID, label: 'Galla', kind: 'galla' };
  if (explicitCash && !explicitBank) return { ok: true, accountId: CASH_IN_HAND_ID, label: 'Cash in Hand', kind: 'cash-in-hand' };

  if (explicitBank) {
    const matches = bankAccounts.filter((account) => {
      if (accountMentioned(text, account)) return true;
      if (!namedBank) return false;
      const accountCompact = compactBankName(account.bankName);
      const requestedCompact = compactBankName(namedBank);
      return Boolean(accountCompact && requestedCompact && (accountCompact.includes(requestedCompact) || requestedCompact.includes(accountCompact)));
    });

    if (matches.length === 1) {
      const account = matches[0];
      return { ok: true, accountId: account.id, label: `${account.bankName}${account.accountType ? ` (${account.accountType})` : ''}`, kind: 'bank' };
    }
    if (matches.length > 1) return { ok: false, reason: 'AMBIGUOUS_BANK', options: matches, requestedBank: namedBank || undefined };

    // A specifically named bank that is not saved must never fall back.
    if (namedBank) return { ok: false, reason: 'BANK_NOT_FOUND', options: bankAccounts, requestedBank: namedBank };
    if (bankAccounts.length === 0) return { ok: false, reason: 'NO_BANK', options: [] };
    if (bankAccounts.length === 1) {
      const account = bankAccounts[0];
      return { ok: true, accountId: account.id, label: `${account.bankName}${account.accountType ? ` (${account.accountType})` : ''}`, kind: 'bank' };
    }
    return { ok: false, reason: 'AMBIGUOUS_BANK', options: bankAccounts };
  }

  return income
    ? { ok: true, accountId: GALLA_ID, label: 'Galla', kind: 'galla' }
    : { ok: true, accountId: CASH_IN_HAND_ID, label: 'Cash in Hand', kind: 'cash-in-hand' };
}

export function bankResolutionMessage(resolution: MoneyAccountResolution, language: 'mr' | 'en') {
  if (resolution.ok) return '';
  if (resolution.reason === 'NO_BANK') {
    return language === 'mr'
      ? 'एकही Bank Account सेव्ह केलेले नाही. आधी Banking पेजमध्ये Bank Account सेव्ह करा; त्यानंतर ही entry Bank मधून नोंदवता येईल.'
      : 'No bank account is saved. Please save a bank account in Banking first, then I can record this entry from the bank.';
  }
  if (resolution.reason === 'BANK_NOT_FOUND') {
    return language === 'mr'
      ? `“${resolution.requestedBank}” नावाचे Bank Account सेव्ह केलेले नाही. Banking पेजमध्ये ते खाते सेव्ह करा किंवा सेव्ह असलेल्या Bank चे नाव सांगा.`
      : `A saved bank account matching “${resolution.requestedBank}” was not found. Save that bank in Banking or tell me a saved bank name.`;
  }
  const names = resolution.options.map((a) => `${a.bankName}${a.accountType ? ` (${a.accountType})` : ''}`).join(', ');
  return language === 'mr'
    ? `एकापेक्षा जास्त Bank Accounts सेव्ह आहेत: ${names}. कोणत्या Bank मधून/मध्ये ही entry करायची ते सांगा.`
    : `Multiple bank accounts are saved: ${names}. Tell me which bank account this entry should use.`;
}
