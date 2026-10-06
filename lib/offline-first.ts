'use client';

import { db, clearAllLocalAppData } from './offline-db';

export const OFFLINE_ACTIVE_USER_KEY = 'vyaparos:offline-active-user';
export const OFFLINE_LAST_SYNC_KEY = 'vyaparos:offline-last-sync';
export const OFFLINE_SCHEMA_VERSION = 1;

export function getOfflineActiveUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(OFFLINE_ACTIVE_USER_KEY);
}

export async function prepareOfflineWorkspace(userId: string): Promise<{ switchedUser: boolean }> {
  if (typeof window === 'undefined' || !userId) return { switchedUser: false };

  const previousUserId = getOfflineActiveUserId();
  const switchedUser = Boolean(previousUserId && previousUserId !== userId);

  // The local database is intentionally user-isolated. If a different account
  // is opened on the same browser/device, never expose the previous account's
  // cached business data.
  if (switchedUser) {
    await clearAllLocalAppData();
  }

  window.localStorage.setItem(OFFLINE_ACTIVE_USER_KEY, userId);
  window.localStorage.setItem('vyaparos:offline-schema-version', String(OFFLINE_SCHEMA_VERSION));
  return { switchedUser };
}

export async function clearOfflineWorkspace(): Promise<void> {
  await db.sync_queue.clear();
  await clearAllLocalAppData();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(OFFLINE_ACTIVE_USER_KEY);
    window.localStorage.removeItem(OFFLINE_LAST_SYNC_KEY);
    window.sessionStorage.removeItem('vyaparos-app-unlocked');
  }
}

export function markOfflineSync(at = Date.now()): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(OFFLINE_LAST_SYNC_KEY, String(at));
  }
}

export function getLastOfflineSync(): number | null {
  if (typeof window === 'undefined') return null;
  const value = Number(window.localStorage.getItem(OFFLINE_LAST_SYNC_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}
