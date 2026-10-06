import { supabase } from './supabase';
import { db, type TableName, type SyncQueueEntry } from './offline-db';

interface SyncResult {
  pushed: number;
  pulled: number;
  errors: number;
}

const COLUMN_MAP: Record<TableName, { localToRemote: Record<string, string> }> = {
  bank_accounts: {
    localToRemote: {
      bank_name: 'bank_name',
      account_holder_name: 'account_holder_name',
      account_number: 'account_number',
      ifsc_code: 'ifsc_code',
      account_type: 'account_type',
      balance: 'balance',
      upi_id: 'upi_id',
      created_at: 'created_at',
    },
  },
  sub_savings: {
    localToRemote: {
      scheme_type: 'scheme_type',
      scheme_number: 'scheme_number',
      linked_bank_account_id: 'linked_bank_account_id',
      deposit_amount: 'deposit_amount',
      maturity_date: 'maturity_date',
      interest_rate: 'interest_rate',
      status: 'status',
      created_at: 'created_at',
    },
  },
  transactions: {
    localToRemote: {
      type: 'type',
      amount: 'amount',
      category: 'category',
      description: 'description',
      date: 'date',
      tag: 'tag',
      source_account_id: 'source_account_id',
      dest_account_id: 'dest_account_id',
      is_from_galla: 'is_from_galla',
      shop_name: 'shop_name',
      expense_items: 'expense_items',
      created_at: 'created_at',
    },
  },
  financial_goals: {
    localToRemote: {
      title: 'title',
      target_amount: 'target_amount',
      saved_amount: 'saved_amount',
      deadline: 'deadline',
      color: 'color',
      created_at: 'created_at',
    },
  },
  inventory_items: {
    localToRemote: {
      name: 'name',
      stock: 'stock',
      min_stock: 'min_stock',
      unit: 'unit',
      category: 'category',
      purchase_price: 'purchase_price',
      selling_price: 'selling_price',
      tax_rate: 'tax_rate',
      hsn_code: 'hsn_code',
      photo_url: 'photo_url',
      show_on_pos: 'show_on_pos',
      created_at: 'created_at',
    },
  },
  invoices: {
    localToRemote: {
      invoice_number: 'invoice_number',
      items: 'items',
      subtotal: 'subtotal',
      discount: 'discount',
      total: 'total',
      payment_method: 'payment_method',
      customer_name: 'customer_name',
      upi_account_id: 'upi_account_id',
      transaction_id: 'transaction_id',
      date: 'date',
      created_at: 'created_at',
      customer_id: 'customer_id',
      customer_phone: 'customer_phone',
      customer_address: 'customer_address',
      tax_mode: 'tax_mode',
      tax_value: 'tax_value',
      tax_amount: 'tax_amount',
      discount_mode: 'discount_mode',
      discount_value: 'discount_value',
      round_off: 'round_off',
      round_off_amount: 'round_off_amount',
      payment_account_id: 'payment_account_id',
      payment_status: 'payment_status',
      balance_due: 'balance_due',
      terms: 'terms',
      signature_enabled: 'signature_enabled',
      state_of_supply: 'state_of_supply',
      description: 'description',
      attachment_name: 'attachment_name',
      attachment_data_url: 'attachment_data_url',
    },
  },
  ledger_parties: {
    localToRemote: {
      name: 'name',
      type: 'type',
      phone: 'phone',
      email: 'email',
      address: 'address',
      photo_url: 'photo_url',
      upi_id: 'upi_id',
      opening_balance: 'opening_balance',
      notes: 'notes',
      created_at: 'created_at',
    },
  },
  ledger_entries: {
    localToRemote: {
      party_id: 'party_id',
      type: 'type',
      amount: 'amount',
      description: 'description',
      date: 'date',
      created_at: 'created_at',
    },
  },
  business_profiles: {
    localToRemote: {
      owner_name: 'owner_name',
      business_name: 'business_name',
      business_address: 'business_address',
      phone: 'phone',
      email: 'email',
      gstin: 'gstin',
      signature_url: 'signature_url',
      stamp_url: 'stamp_url',
    },
  },
};

function toRemotePayload(
  table: TableName,
  localRow: Record<string, unknown>,
  userId?: string,
): Record<string, unknown> {
  const mapping = COLUMN_MAP[table].localToRemote;
  const remote: Record<string, unknown> = {};

  for (const [localKey, remoteKey] of Object.entries(mapping)) {
    if (localKey in localRow) {
      remote[remoteKey] = localRow[localKey];
    }
  }

  // All application tables are RLS-protected by auth.uid() = user_id.
  // Explicitly sending the authenticated user's id makes inserts deterministic
  // and prevents a missing/incorrect default from silently failing RLS.
  if (userId && table !== 'business_profiles') {
    remote.user_id = userId;
  } else if (userId && table === 'business_profiles') {
    remote.user_id = userId;
  }

  return remote;
}

function toLocalRow(table: TableName, remoteRow: Record<string, unknown>): Record<string, unknown> {
  const mapping = COLUMN_MAP[table].localToRemote;
  const local: Record<string, unknown> = { id: remoteRow.id, is_synced: 'synced', updated_at: Date.now() };
  for (const [localKey, remoteKey] of Object.entries(mapping)) {
    if (remoteKey in remoteRow) {
      local[localKey] = remoteRow[remoteKey];
    }
  }
  return local;
}

async function pushPending(): Promise<{ pushed: number; errors: number }> {
  let pushed = 0;
  let errors = 0;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;

  if (sessionError || !userId) {
    return { pushed: 0, errors: 0 };
  }

  const queue = await db.sync_queue.orderBy('created_at').toArray();

  for (const entry of queue) {
    if (entry.retries >= 10) continue;

    try {
      const payload = JSON.parse(entry.payload) as Record<string, unknown>;
      const table = entry.table_name as TableName;

      if (entry.operation === 'delete') {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', entry.record_id);

        if (error) throw error;
      } else {
        const remotePayload = toRemotePayload(table, payload, userId);

        // Upsert makes retries safe and also repairs the common case where a
        // local record was created before its first cloud push.
        const { error } = await supabase
          .from(table)
          .upsert(
            { id: entry.record_id, ...remotePayload },
            { onConflict: 'id' },
          );

        if (error) throw error;
      }

      await db.sync_queue.delete(entry.id!);
      pushed++;

      const tableRef = (db as unknown as Record<string, {
        get: (id: string) => Promise<Record<string, unknown> | undefined>;
        put: (row: Record<string, unknown>) => Promise<unknown>;
      }>)[table];

      const row = await tableRef?.get(entry.record_id);
      if (row) {
        await tableRef.put({
          ...row,
          is_synced: 'synced',
          sync_error: null,
          updated_at: Date.now(),
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      await db.sync_queue.update(entry.id!, {
        retries: entry.retries + 1,
      });

      // Keep the local record visible and retain the exact cloud error so the
      // UI/debug tools can identify RLS, UUID, schema, or network problems.
      try {
        const tableRef = (db as unknown as Record<string, {
          get: (id: string) => Promise<Record<string, unknown> | undefined>;
          put: (row: Record<string, unknown>) => Promise<unknown>;
        }>)[entry.table_name];

        const row = await tableRef?.get(entry.record_id);
        if (row) {
          await tableRef.put({
            ...row,
            is_synced: 'error',
            sync_error: message,
            updated_at: Date.now(),
          });
        }
      } catch {
        // Do not hide the original sync error if local status update fails.
      }

      console.error(
        `[Supabase Sync] ${entry.operation} ${entry.table_name}/${entry.record_id}:`,
        message,
      );
      errors++;
    }
  }

  return { pushed, errors };
}

async function pullRemote(): Promise<{ pulled: number }> {
  let pulled = 0;
  const tables: TableName[] = [
    'bank_accounts',
    'sub_savings',
    'transactions',
    'financial_goals',
    'inventory_items',
    'invoices',
    'ledger_parties',
    'ledger_entries',
    'business_profiles',
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error || !data) continue;

      const tableRef = (db as unknown as Record<string, {
        bulkPut: (rows: Record<string, unknown>[]) => Promise<unknown>;
        get: (id: string) => Promise<Record<string, unknown> | undefined>;
        toArray: () => Promise<Record<string, unknown>[]>;
        delete: (id: string) => Promise<unknown>;
      }>)[table];

      const remoteRows = data as Record<string, unknown>[];
      const remoteIds = new Set(remoteRows.map((row) => String(row.id)));
      const localRows = await tableRef.toArray();

      // Reconcile deletions: if a record was removed from Supabase and the
      // local copy is already synced, remove that stale local record too.
      for (const localRow of localRows) {
        const localId = String(localRow.id);
        if (!remoteIds.has(localId) && localRow.is_synced === 'synced') {
          await tableRef.delete(localId);
        }
      }

      const rows: Record<string, unknown>[] = [];

      for (const remoteRow of remoteRows) {
        const localRow = await tableRef.get(String(remoteRow.id));

        // Never overwrite a local pending change with an older remote snapshot.
        if (
          localRow &&
          (localRow.is_synced === 'pending' ||
            localRow.is_synced === 'error')
        ) {
          continue;
        }

        rows.push(toLocalRow(table, remoteRow));
      }

      if (rows.length > 0) {
        await tableRef.bulkPut(rows);
        pulled += rows.length;
      }
    } catch {
      // continue to next table on error
    }
  }

  return { pulled };
}

export async function syncAll(): Promise<SyncResult> {
  // Never start cloud pulls/pushes while the browser is known to be offline.
  // All CRUD remains local in Dexie and the queue is retried on reconnect.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { pushed: 0, pulled: 0, errors: 0 };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('[Supabase Sync] Session error:', sessionError.message);
    return { pushed: 0, pulled: 0, errors: 1 };
  }

  if (!sessionData.session) {
    // RLS requires an authenticated Supabase user. Keep local data safe and
    // leave the queue untouched so it can be pushed immediately after login.
    return { pushed: 0, pulled: 0, errors: 0 };
  }

  const pushResult = await pushPending();
  const pullResult = await pullRemote();

  return {
    pushed: pushResult.pushed,
    pulled: pullResult.pulled,
    errors: pushResult.errors,
  };
}

export async function enqueueSync(
  table: TableName,
  recordId: string,
  operation: 'insert' | 'update' | 'delete',
  payload: Record<string, unknown>
): Promise<void> {
  const entry: SyncQueueEntry = {
    table_name: table,
    record_id: recordId,
    operation,
    payload: JSON.stringify(payload),
    created_at: Date.now(),
    retries: 0,
  };
  await db.sync_queue.add(entry);
}

export async function hasPendingChanges(): Promise<boolean> {
  const count = await db.sync_queue.count();
  return count > 0;
}

export async function getPendingCount(): Promise<number> {
  return db.sync_queue.count();
}
