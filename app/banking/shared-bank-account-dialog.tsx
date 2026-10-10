'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMultiUser } from './multi-user-context';
import { supabase } from '@/lib/supabase';
import type { BankAccount } from './types';

type ShareRow = { id: string; target_business_id: string; businesses?: { name?: string } | null };

export function SharedBankAccountDialog({ 
  account, 
  showTrigger = true, 
  open, 
  onOpenChange 
}: { 
  account: BankAccount; 
  showTrigger?: boolean; 
  open?: boolean; 
  onOpenChange?: (open: boolean) => void 
}) {
  const { businessId, businesses } = useMultiUser();
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = open ?? localOpen;
  const setIsOpen = (next: boolean) => { 
    if (open === undefined) setLocalOpen(next); 
    onOpenChange?.(next); 
  };

  const [targetId, setTargetId] = useState('');
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!businessId || !account.id) return;
    const { data, error } = await supabase
      .from('business_shared_bank_accounts')
      .select('id,target_business_id')
      .eq('owner_business_id', businessId)
      .eq('bank_account_id', account.id);
      
    if (error) { setMessage(error.message); return; }
    
    const result = (data ?? []) as ShareRow[];
    const targetIds = result.map((r) => r.target_business_id);
    const businessList = Array.isArray(businesses) ? businesses : [];
    const names = businessList.filter((b) => targetIds.includes(b.id));
    
    setRows(
      result.map((r) => ({
        ...r,
        businesses: { name: names.find((b) => b.id === r.target_business_id)?.name ?? 'Business' }
      }))
    );
  };

  useEffect(() => { if (isOpen) void load(); }, [isOpen, businessId, account.id, businesses]);

  // सुरक्षित बिझनेस फिल्टरिंग लॉजिक
  const businessList = Array.isArray(businesses) ? businesses : [];
  const candidates = businessList.filter(
    (b) => String(b.id) !== String(businessId) && !rows.some((r) => String(r.target_business_id) === String(b.id))
  );

  const share = async () => {
    if (!businessId || !targetId) return;
    setBusy(true); setMessage('');
    const { error } = await supabase
      .from('business_shared_bank_accounts')
      .insert({ owner_business_id: businessId, target_business_id: targetId, bank_account_id: account.id });
      
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setTargetId(''); await load(); setMessage('बँक खाते Share झाले.');
  };

  const unshare = async (id: string) => {
    setBusy(true); 
    const { error } = await supabase.from('business_shared_bank_accounts').delete().eq('id', id);
    setBusy(false);
    if (error) setMessage(error.message); else { await load(); setMessage('Sharing काढले.'); }
  };

  return (
    <>
      {showTrigger && (
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={() => setIsOpen(true)}>
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
      )}

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-2" 
          role="dialog" 
          aria-modal="true"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}
        >
          <div className="w-full max-w-sm rounded-xl border bg-background p-3.5 shadow-xl">
            
            {/* हेडर */}
            <div className="mb-2 flex items-center justify-between border-b pb-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Share Bank Account</h2>
                <p className="truncate text-[11px] text-muted-foreground">
                  {account.bankName} ••••{(account.accountNumber ?? '').slice(-4)}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setIsOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* माहिती मेसेज */}
            <p className="mb-2.5 text-[11px] leading-snug text-muted-foreground">
              Shared account चे व्यवहार प्रत्येक business मध्ये स्वतंत्र नोंदवले जातील.
            </p>

            {/* बिझनेस ड्रॉपडाऊन आणि बटन */}
            <div className="flex gap-1.5">
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Business निवडा" />
                </SelectTrigger>
                {/* z-[10000] मुळे ड्रॉपडाऊन लिस्ट पॉपअप विंडोच्या वर अचूक दिसेल */}
                <SelectContent className="z-[10000]">
                  {candidates.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 px-3 text-xs" onClick={() => void share()} disabled={busy || !targetId}>
                {busy ? '...' : 'Share'}
              </Button>
            </div>

            {/* Shared List */}
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium">Shared with</p>
              {rows.length === 0 ? (
                <p className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                  कोणत्याही business सोबत share केलेले नाही.
                </p>
              ) : (
                <div className="max-h-28 overflow-y-auto space-y-1 pr-0.5">
                  {rows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-md border px-2.5 py-1 text-xs">
                      <span className="truncate pr-2 text-[12px]">{r.businesses?.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void unshare(r.id)}
                        className="h-6 px-1.5 text-[11px] text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> Unshare
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* मेसेज */}
            {message && <p className="mt-2 text-[11px] text-muted-foreground">{message}</p>}

            {/* फुटर */}
            <div className="mt-3 flex justify-end border-t pt-2">
              <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}