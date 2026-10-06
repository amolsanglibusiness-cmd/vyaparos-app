'use client';

import { useState } from 'react';
import { UserPlus, PackagePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { InventoryItem, LedgerParty } from './types';
import { generateId } from './mock-data';

export interface NewCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCustomers: LedgerParty[];
  initialName?: string;
  initialPhone?: string;
  initialAddress?: string;
  onSaved: (party: LedgerParty) => void;
}

export function NewCustomerDialog({ open, onOpenChange, existingCustomers, initialName = '', initialPhone = '', initialAddress = '', onSaved }: NewCustomerDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const resetFromProps = () => {
    setName(initialName); setPhone(initialPhone.replace(/\D/g, '').slice(0, 10)); setAddress(initialAddress); setError('');
  };

  const save = () => {
    const clean = phone.replace(/\D/g, '').slice(0, 10);
    if (!name.trim()) return setError('Customer name is required.');
    if (clean && clean.length !== 10) return setError('Mobile number must contain 10 digits.');
    const duplicate = existingCustomers.find((c) => clean && c.phone.replace(/\D/g, '') === clean);
    if (duplicate) return setError(`This mobile number is already registered with ${duplicate.name}. Please edit in Ledger.`);
    const party: LedgerParty = {
      id: generateId('customer'), name: name.trim(), type: 'Customer', phone: clean,
      email: '', address: address.trim(), photoUrl: null, upiId: '', openingBalance: 0,
      notes: 'Created from Sale / Invoice', createdAt: new Date().toISOString(),
    };
    onSaved(party); onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); if (value) resetFromProps(); }}>
    <DialogContent className="z-[70] max-h-[90vh] overflow-y-auto sm:max-w-lg mobile-entry-screen">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Add Party / Customer</DialogTitle><DialogDescription>Customer Ledger मध्ये नवीन party तयार करा. Save केल्यावर ती सध्याच्या Sale मध्ये automatic निवडली जाईल.</DialogDescription></DialogHeader>
      <div className="space-y-4 py-2">
        <div><Label>Customer Name *</Label><Input className="mt-1 h-11" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Mobile Number</Label><Input className="mt-1 h-11" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></div>
        <div><Label>Address</Label><textarea className="mt-1 min-h-24 w-full rounded-xl border bg-background p-3 text-sm" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        <div className="mobile-entry-inline-footer"><Button variant="outline" className="shadow-none" onClick={() => onOpenChange(false)}>Cancel</Button><Button className="shadow-none" onClick={save}>Save Customer</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}

export interface NewItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingItems: InventoryItem[];
  initialName?: string;
  onSaved: (item: InventoryItem, quantity: number, taxType: 'without' | 'with', discountPercent: number) => void;
}

export function NewItemDialog({ open, onOpenChange, existingItems, initialName = '', onSaved }: NewItemDialogProps) {
  const [name, setName] = useState(''); const [category, setCategory] = useState('General'); const [hsnCode, setHsnCode] = useState('');
  const [unit, setUnit] = useState('pcs'); const [salePrice, setSalePrice] = useState(''); const [purchasePrice, setPurchasePrice] = useState('');
  const [openingStock, setOpeningStock] = useState('0'); const [minStock, setMinStock] = useState('0'); const [taxRate, setTaxRate] = useState('0');
  const [taxType, setTaxType] = useState<'without' | 'with'>('without'); const [quantity, setQuantity] = useState('1'); const [discountPercent, setDiscountPercent] = useState('0'); const [error, setError] = useState('');

  const resetFromProps = () => { setName(initialName); setCategory('General'); setHsnCode(''); setUnit('pcs'); setSalePrice(''); setPurchasePrice(''); setOpeningStock('0'); setMinStock('0'); setTaxRate('0'); setTaxType('without'); setQuantity('1'); setDiscountPercent('0'); setError(''); };
  const save = () => {
    if (!name.trim()) return setError('Item name is required.');
    const duplicate = existingItems.find((i) => i.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicate) return setError('हा item Inventory मध्ये आधीच आहे.');
    const item: InventoryItem = { id: generateId('inv'), name: name.trim(), stock: Math.max(0, Number(openingStock) || 0), minStock: Math.max(0, Number(minStock) || 0), unit: unit || 'pcs', category: category || 'General', purchasePrice: Math.max(0, Number(purchasePrice) || 0), sellingPrice: Math.max(0, Number(salePrice) || 0), taxRate: Math.max(0, Number(taxRate) || 0), hsnCode, photoUrl: null, showOnPOS: true, createdAt: new Date().toISOString() };
    onSaved(item, Math.max(1, Number(quantity) || 1), taxType, Math.max(0, Number(discountPercent) || 0)); onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); if (value) resetFromProps(); }}>
    <DialogContent className="z-[70] max-h-[90vh] overflow-y-auto sm:max-w-2xl mobile-entry-screen">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5" /> Add New Item</DialogTitle><DialogDescription>Inventory मध्ये item तयार करून तो current invoice draft मध्ये automatic add करा.</DialogDescription></DialogHeader>
      <div className="grid gap-3 py-2 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label>Item Name *</Label><Input className="mt-1 h-11" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Category</Label><Input className="mt-1 h-11" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
        <div><Label>HSN Code</Label><Input className="mt-1 h-11" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} /></div>
        <div><Label>Unit</Label><Input className="mt-1 h-11" value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
        <div><Label>Sale Price</Label><Input className="mt-1 h-11" type="number" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} /></div>
        <div><Label>Purchase Price</Label><Input className="mt-1 h-11" type="number" min="0" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} /></div>
        <div><Label>Opening Stock</Label><Input className="mt-1 h-11" type="number" min="0" value={openingStock} onChange={(e) => setOpeningStock(e.target.value)} /></div>
        <div><Label>Minimum Stock</Label><Input className="mt-1 h-11" type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} /></div>
        <div><Label>Tax %</Label><Input className="mt-1 h-11" type="number" min="0" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
        <div><Label>Tax Type</Label><Select value={taxType} onValueChange={(v) => setTaxType(v as 'without' | 'with')}><SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="without">Without Tax</SelectItem><SelectItem value="with">With Tax</SelectItem></SelectContent></Select></div>
        <div><Label>Sale Quantity</Label><Input className="mt-1 h-11" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
        <div><Label>Discount %</Label><Input className="mt-1 h-11" type="number" min="0" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} /></div>
      </div>
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      <div className="mobile-entry-inline-footer"><Button variant="outline" className="shadow-none" onClick={() => onOpenChange(false)}>Cancel</Button><Button className="shadow-none" onClick={save}>Save & Add to Sale</Button></div>
    </DialogContent>
  </Dialog>;
}
