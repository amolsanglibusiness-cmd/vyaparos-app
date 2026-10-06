'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { readImageFile } from '@/src/lib/image-upload';
import type { LedgerParty, LedgerPartyType } from './types';
import { useSettings } from './settings-context';

export interface PartyFormFields {
  pName: string; setPName: (v: string) => void;
  pType: LedgerPartyType; setPType: (v: LedgerPartyType) => void;
  pPhone: string; setPPhone: (v: string) => void;
  pEmail: string; setPEmail: (v: string) => void;
  pAddress: string; setPAddress: (v: string) => void;
  pUpiId: string; setPUpiId: (v: string) => void;
  pGstin: string; setPGstin: (v: string) => void;
  pNotes: string; setPNotes: (v: string) => void;
  pPhotoUrl: string; setPPhotoUrl: (v: string) => void;
}

export function AddPartyDialogContent({ editParty, fields, onSave, onCancel, t }: {
  editParty: LedgerParty | null;
  fields: PartyFormFields;
  onSave: () => void;
  onCancel: () => void;
  t: ReturnType<typeof useSettings>['t'];
}) {
  const [partyPhotoError, setPartyPhotoError] = useState<string | null>(null);

  return (
    <DialogContent className="z-[70] max-w-md mobile-entry-screen">
      <DialogHeader>
        <DialogTitle>{editParty ? t.editParty : t.addParty}</DialogTitle>
        <DialogDescription>
          {editParty ? 'Update contact details for this party.' : 'Add a customer or supplier to track Udhari balances.'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>{t.partyName}</Label><Input placeholder="Full name" value={fields.pName} onChange={(e) => fields.setPName(e.target.value)} autoFocus /></div>
          <div className="space-y-1.5"><Label>{t.partyType}</Label><Select value={fields.pType} onValueChange={(v) => fields.setPType(v as LedgerPartyType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Customer">{t.customer}</SelectItem><SelectItem value="Supplier">{t.supplier}</SelectItem></SelectContent></Select></div>
        </div>
        <div className="space-y-1.5"><Label>{t.profilePhoto}</Label><div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-3">{fields.pPhotoUrl ? <img src={fields.pPhotoUrl} alt="Party preview" className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover" /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted"><User className="h-7 w-7 text-muted-foreground/50" /></div>}<div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"><User className="mr-2 h-4 w-4" />{fields.pPhotoUrl ? 'Change Photo' : t.addPhoto}<input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const file=e.target.files?.[0]; e.currentTarget.value=''; if (!file) return; try { setPartyPhotoError(null); fields.setPPhotoUrl(await readImageFile(file)); } catch (error) { setPartyPhotoError(error instanceof Error ? error.message : 'Unable to upload photo.'); } }} /></label>{fields.pPhotoUrl && <Button type="button" variant="outline" size="sm" onClick={() => { setPartyPhotoError(null); fields.setPPhotoUrl(''); }}>{t.remove}</Button>}</div><p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG, WEBP • Maximum 2MB</p>{partyPhotoError && <p className="mt-1 text-xs text-destructive">{partyPhotoError}</p>}</div></div></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>{t.phone}</Label><Input placeholder="9876543210" value={fields.pPhone} onChange={(e) => fields.setPPhone(e.target.value)} type="tel" /></div><div className="space-y-1.5"><Label>{t.upiId}</Label><Input placeholder="name@upi" value={fields.pUpiId} onChange={(e) => fields.setPUpiId(e.target.value)} /></div></div>
        <div className="space-y-1.5"><Label>{t.email}</Label><Input placeholder="email@example.com" value={fields.pEmail} onChange={(e) => fields.setPEmail(e.target.value)} type="email" /></div>
        <div className="space-y-1.5"><Label>{t.address}</Label><Input placeholder="Full address" value={fields.pAddress} onChange={(e) => fields.setPAddress(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t.partyGstin}</Label><Input placeholder="22AAAAA0000A1Z5" value={fields.pGstin} onChange={(e) => fields.setPGstin(e.target.value.toUpperCase())} /></div>
        <div className="space-y-1.5"><Label>{t.notes}</Label><Input placeholder="Any notes about this party" value={fields.pNotes} onChange={(e) => fields.setPNotes(e.target.value)} /></div>
      </div>
      <DialogFooter className="mobile-entry-footer"><Button variant="outline" onClick={onCancel}>{t.cancel}</Button><Button onClick={onSave}>{editParty ? 'Update' : t.save}</Button></DialogFooter>
    </DialogContent>
  );
}

export function AddPartyDialog({ open, onOpenChange, editParty, fields, onSave, t }: { open: boolean; onOpenChange: (open: boolean) => void; editParty: LedgerParty | null; fields: PartyFormFields; onSave: () => void; t: ReturnType<typeof useSettings>['t']; }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><AddPartyDialogContent editParty={editParty} fields={fields} onSave={onSave} onCancel={() => onOpenChange(false)} t={t} /></Dialog>;
}
