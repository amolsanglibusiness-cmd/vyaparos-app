'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { InventoryItem } from '@/app/banking/types';
import { useAppData } from '@/app/banking/app-data-context';
import {
  getOnlineState,
  setStoredInventory,
  subscribeToNetworkStatus,
} from '@/src/lib/storage';

interface InventoryContextValue {
  inventory: InventoryItem[];
  onlineState: boolean;
  addItem: (item: InventoryItem) => void;
  updateItem: (item: InventoryItem) => void;
  deleteItem: (id: string) => void;
  refreshInventoryMirror: () => void;
}

const InventoryContext =
  createContext<InventoryContextValue | undefined>(undefined);

export function InventoryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    inventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  } = useAppData();

  const [onlineState, setOnlineState] = useState(true);

  useEffect(() => {
    setOnlineState(getOnlineState());
    setStoredInventory(inventoryItems);
  }, [inventoryItems]);

  useEffect(() => {
    return subscribeToNetworkStatus(setOnlineState);
  }, []);

  const addItem = useCallback(
    (item: InventoryItem) => {
      addInventoryItem(item);
    },
    [addInventoryItem],
  );

  const updateItem = useCallback(
    (item: InventoryItem) => {
      updateInventoryItem(item);
    },
    [updateInventoryItem],
  );

  const deleteItem = useCallback(
    (id: string) => {
      deleteInventoryItem(id);
    },
    [deleteInventoryItem],
  );

  const refreshInventoryMirror = useCallback(() => {
    setStoredInventory(inventoryItems);
  }, [inventoryItems]);

  const value = useMemo(
    () => ({
      inventory: inventoryItems,
      onlineState,
      addItem,
      updateItem,
      deleteItem,
      refreshInventoryMirror,
    }),
    [
      inventoryItems,
      onlineState,
      addItem,
      updateItem,
      deleteItem,
      refreshInventoryMirror,
    ],
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}

      {!onlineState && (
        <div className="fixed inset-x-0 top-0 z-[9999] flex justify-center px-3 pt-2">
          <div
            role="status"
            aria-live="polite"
            className="rounded-full border border-amber-500/30 bg-amber-100 px-4 py-2 text-xs font-medium text-amber-900 shadow-lg dark:bg-amber-950 dark:text-amber-100"
          >
            ऑफलाइन मोड — तुमचे बदल लोकल स्टोरेजमध्ये सेव्ह होत आहेत.
          </div>
        </div>
      )}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);

  if (!context) {
    throw new Error(
      'useInventory must be used inside InventoryProvider',
    );
  }

  return context;
}
