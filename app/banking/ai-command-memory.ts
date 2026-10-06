'use client';

export interface LearnedCommand {
  id: string;
  phrase: string;
  canonicalCommand: string;
  explanation: string;
  createdAt: string;
  useCount: number;
}

const STORAGE_PREFIX = 'vyaparos-ai-learned-commands-v1';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)))
    .replace(/[’']/g, '')
    .replace(/[?？!।,，;；:："“”‘’(){}\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function key(userId?: string | null) {
  return `${STORAGE_PREFIX}:${userId || 'device'}`;
}

export function getLearnedCommands(userId?: string | null): LearnedCommand[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLearnedCommand(
  command: Omit<LearnedCommand, 'id' | 'createdAt' | 'useCount'>,
  userId?: string | null,
): LearnedCommand {
  const existing = getLearnedCommands(userId);
  const normalizedPhrase = normalize(command.phrase);
  const next: LearnedCommand = {
    ...command,
    id: `learned-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    useCount: 0,
  };
  const filtered = existing.filter(item => normalize(item.phrase) !== normalizedPhrase);
  const all = [next, ...filtered].slice(0, 200);
  localStorage.setItem(key(userId), JSON.stringify(all));
  return next;
}

export function findLearnedCommand(input: string, userId?: string | null): LearnedCommand | null {
  const value = normalize(input);
  if (!value) return null;
  const rows = getLearnedCommands(userId);

  const exact = rows.find(row => normalize(row.phrase) === value);
  if (exact) return exact;

  // A learned phrase may be spoken with common polite words added.
  const compact = value
    .replace(/\b(कृपया|please|जरा|मला|माझे|माझा|माझी|दाखवा|दाखव|करा|कर)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return rows.find(row => {
    const phrase = normalize(row.phrase);
    return phrase === compact || (phrase.length >= 5 && (value.includes(phrase) || compact.includes(phrase)));
  }) ?? null;
}

export function markLearnedCommandUsed(id: string, userId?: string | null) {
  const rows = getLearnedCommands(userId);
  const next = rows.map(row => row.id === id ? { ...row, useCount: row.useCount + 1 } : row);
  localStorage.setItem(key(userId), JSON.stringify(next));
}

export function deleteLearnedCommand(id: string, userId?: string | null) {
  const rows = getLearnedCommands(userId).filter(row => row.id !== id);
  localStorage.setItem(key(userId), JSON.stringify(rows));
}

export function normalizeLearnedText(value: string) {
  return normalize(value);
}
