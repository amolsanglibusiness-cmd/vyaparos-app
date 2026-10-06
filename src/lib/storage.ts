'use client';

import type { InventoryItem } from '@/app/banking/types';

export const INVENTORY_STORAGE_KEY = 'financehub_inventory_mirror_v2';
export const INVENTORY_UPDATED_EVENT = 'inventory-updated';
export const NETWORK_STATUS_EVENT = 'network-status-changed';

const isBrowser = () => typeof window !== 'undefined';

function dispatchInventoryUpdated(items: InventoryItem[]) {
  if (!isBrowser()) return;

  window.dispatchEvent(
    new CustomEvent<InventoryItem[]>(INVENTORY_UPDATED_EVENT, {
      detail: items,
    }),
  );
}

/**
 * LocalStorage mirror.
 *
 * Dexie remains the authoritative offline database in this application.
 * This mirror exists for lightweight persistence/interop and the requested
 * inventory-updated event. It is never used to replace Dexie's sync queue.
 */
export function getStoredInventory(
  fallback: InventoryItem[] = [],
): InventoryItem[] {
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(INVENTORY_STORAGE_KEY);

    if (raw === null) {
      window.localStorage.setItem(
        INVENTORY_STORAGE_KEY,
        JSON.stringify(fallback),
      );
      return fallback;
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as InventoryItem[])
      : fallback;
  } catch (error) {
    console.error('Failed to read inventory mirror:', error);
    return fallback;
  }
}

export function setStoredInventory(items: InventoryItem[]): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(
      INVENTORY_STORAGE_KEY,
      JSON.stringify(items),
    );
    dispatchInventoryUpdated(items);
  } catch (error) {
    console.error('Failed to write inventory mirror:', error);
  }
}

export function clearStoredInventory(): void {
  if (!isBrowser()) return;

  window.localStorage.removeItem(INVENTORY_STORAGE_KEY);
  dispatchInventoryUpdated([]);
}

export function getOnlineState(): boolean {
  return isBrowser() ? navigator.onLine : true;
}

export function subscribeToNetworkStatus(
  callback: (online: boolean) => void,
): () => void {
  if (!isBrowser()) return () => undefined;

  const handleOnline = () => {
    callback(true);
    window.dispatchEvent(
      new CustomEvent<boolean>(NETWORK_STATUS_EVENT, {
        detail: true,
      }),
    );
  };

  const handleOffline = () => {
    callback(false);
    window.dispatchEvent(
      new CustomEvent<boolean>(NETWORK_STATUS_EVENT, {
        detail: false,
      }),
    );
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export function subscribeToInventory(
  callback: (items: InventoryItem[]) => void,
): () => void {
  if (!isBrowser()) return () => undefined;

  const handleUpdate = (event: Event) => {
    const customEvent = event as CustomEvent<InventoryItem[]>;

    if (Array.isArray(customEvent.detail)) {
      callback(customEvent.detail);
      return;
    }

    callback(getStoredInventory());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== INVENTORY_STORAGE_KEY) return;
    callback(getStoredInventory());
  };

  window.addEventListener(INVENTORY_UPDATED_EVENT, handleUpdate);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(INVENTORY_UPDATED_EVENT, handleUpdate);
    window.removeEventListener('storage', handleStorage);
  };
}
