'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncAll, getPendingCount } from '@/lib/sync-service';
import { supabase } from '@/lib/supabase';
import { markOfflineSync } from '@/lib/offline-first';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface OnlineSyncValue {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  lastSyncAt: number | null;
  triggerSync: () => Promise<void>;
}

export function useOnlineSync(): OnlineSyncValue {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    syncingRef.current = true;
    setSyncState('syncing');
    try {
      const result = await syncAll();
      setSyncState(result.errors > 0 ? 'error' : 'synced');
      const syncedAt = Date.now();
      setLastSyncAt(syncedAt);
      markOfflineSync(syncedAt);
      await refreshPending();
    } catch {
      setSyncState('error');
    } finally {
      syncingRef.current = false;
    }
  }, [refreshPending]);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  // A Supabase session may be restored asynchronously after the app mounts.
  // Sync as soon as authentication becomes available instead of waiting for
  // the next network event or 60-second interval.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void triggerSync();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [triggerSync]);

  // Android/iOS resume is a first-class sync trigger. This matters when the
  // app stayed open while offline and connectivity returned while it was in
  // the background.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener: { remove: () => Promise<void> } | null = null;
    let disposed = false;
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void triggerSync();
    }).then((handle) => {
      if (disposed) void handle.remove();
      else listener = handle;
    });
    return () => {
      disposed = true;
      if (listener) void listener.remove();
    };
  }, [triggerSync]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  // Sync once immediately when the app is already online, then keep the
  // existing periodic retry as a safety net.
  useEffect(() => {
    if (!isOnline) return;

    void triggerSync();

    const interval = setInterval(() => {
      triggerSync();
    }, 60000);

    return () => clearInterval(interval);
  }, [isOnline, triggerSync]);

  return { isOnline, syncState, pendingCount, lastSyncAt, triggerSync };
}
