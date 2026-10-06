export const BUILTIN_SUB_SAVINGS_TYPES = ['Daily Pigmy', 'RD', 'FD', 'Gold Savings'] as const;
export const SUB_SAVINGS_TYPES_STORAGE_KEY = 'vyaparos-sub-savings-scheme-types';

export function loadCustomSubSavingsTypes(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SUB_SAVINGS_TYPES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0 && !BUILTIN_SUB_SAVINGS_TYPES.includes(v as any));
  } catch { return []; }
}

export function saveCustomSubSavingsTypes(types: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SUB_SAVINGS_TYPES_STORAGE_KEY, JSON.stringify(types));
}
