'use client';

import { useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Printer } from '@dimer47/capacitor-plugin-printer';
import { QRCodeSVG } from 'qrcode.react';
import { Store, Wallet } from 'lucide-react';

import type { Invoice, BankAccount } from './types';
import { useSettings } from './settings-context';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

interface ReceiptProps {
  invoice: Invoice;
  bankAccount: BankAccount | null;
  size: '2inch' | '3inch';
  onClose: () => void;
}

export function ReceiptDialog({ invoice, bankAccount, size, onClose }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { t, businessProfile } = useSettings();

  const is2inch = size === '2inch';
  const widthClass = is2inch ? 'w-[280px]' : 'w-[380px]';
  const fontSize = is2inch ? 'text-[10px]' : 'text-xs';
  const headerSize = is2inch ? 'text-sm' : 'text-lg';
  const titleSize = is2inch ? 'text-base' : 'text-xl';

  const upiString = bankAccount
    ? `upi://pay?pa=${bankAccount.upiId}&pn=${encodeURIComponent(bankAccount.accountHolderName)}&am=${invoice.total}&cu=INR&tn=${invoice.invoiceNumber}`
    : '';

  const handlePrint = async () => {
    if (typeof window === 'undefined' || !receiptRef.current) return;

    const printContents = receiptRef.current.innerHTML;
    const styles = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; padding: 8px; }
      .receipt { width: ${is2inch ? '280px' : '380px'}; margin: 0 auto; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 2px 4px; text-align: left; font-size: ${is2inch ? '10px' : '12px'}; }
      .center { text-align: center; } .right { text-align: right; } .bold { font-weight: bold; }
      .border-top { border-top: 1px dashed #000; margin: 4px 0; }
      .border-bottom { border-bottom: 1px dashed #000; margin: 4px 0; }
      .logo { width: 40px; height: 40px; border-radius: 8px; background: #0284c7; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; margin: 0 auto; }
      .stamp { width: 70px; height: 70px; border: 2px solid #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0284c7; font-weight: bold; font-size: 9px; text-align: center; transform: rotate(-12deg); margin: 4px auto; opacity: 0.6; }
      img.qr { display: block; margin: 4px auto; }
      .sig-line { border-top: 1px solid #000; width: 120px; margin: 12px auto 2px; }
    `;
    const html = `<html><head><title>Receipt ${invoice.invoiceNumber}</title><style>${styles}</style></head><body><div class="receipt">${printContents}</div></body></html>`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Printer.printHtml({ html });
      } catch (error) {
        console.error('Native receipt print failed', error);
      }
      return;
    }

    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="mt-8 w-full max-w-md rounded-2xl bg-card p-4 shadow-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">{t.receipt}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              🖨️ {is2inch ? '2"' : '3"'} {t.print}
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Receipt body */}
        <div ref={receiptRef} className={`${widthClass} mx-auto rounded-lg border border-border bg-white p-3 text-slate-900 ${fontSize}`}>
          {/* Business Header */}
          <div className="center text-center">
            <div className="logo mb-1.5 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500 font-bold text-white">
              {businessProfile.businessName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <p className={`bold font-bold ${headerSize}`}>{businessProfile.businessName}</p>
            <p className="text-[9px] text-slate-600">{businessProfile.businessAddress}</p>
            <p className="text-[9px] text-slate-600">Phone: +91 {businessProfile.phone}</p>
            {businessProfile.gstin && (
              <p className="text-[9px] text-slate-600">GSTIN: {businessProfile.gstin}</p>
            )}
          </div>

          <div className="border-top my-2 border-t border-dashed border-slate-300" />

          {/* Invoice info */}
          <div className="flex justify-between">
            <span className="font-semibold">{t.invoiceNo}: {invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.date}: {formatDate(invoice.date)}</span>
            <span>{formatTime(invoice.date)}</span>
          </div>
          {invoice.customerName && (
            <div className="flex justify-between">
              <span>{t.customerName}: {invoice.customerName}</span>
            </div>
          )}

          <div className="border-bottom my-2 border-b border-dashed border-slate-300" />

          {/* Items table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-dashed border-slate-300">
                <th className="py-1 text-left font-semibold">{t.item}</th>
                <th className="py-1 text-center font-semibold">{t.qty}</th>
                <th className="py-1 text-right font-semibold">{t.rate}</th>
                <th className="py-1 text-right font-semibold">{t.amt}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.product.id} className="border-b border-dotted border-slate-200">
                  <td className="py-1 pr-1">{item.product.name}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">{item.product.price.toFixed(0)}</td>
                  <td className="py-1 text-right">{(item.product.price * item.quantity).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-top my-2 border-t border-dashed border-slate-300" />

          {/* Totals */}
          <div className="flex justify-between py-0.5">
            <span>{t.subtotal}</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between py-0.5">
              <span>{t.discount}</span>
              <span>-{formatCurrency(invoice.discount)}</span>
            </div>
          )}
          <div className="bold mt-1 flex justify-between border-t border-dashed border-slate-400 pt-1 text-sm font-bold">
            <span>{t.total}</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
          <div className="mt-1 flex justify-between py-0.5">
            <span>{t.paidVia}: {invoice.paymentMethod}</span>
          </div>

          <div className="border-top my-2 border-t border-dashed border-slate-300" />

          {bankAccount && (
            <div className="mt-2 text-center text-[9px] text-slate-600">
              <p className="font-semibold text-slate-800">{bankAccount.bankName} ({bankAccount.accountType})</p>
              <p>{bankAccount.accountHolderName} • A/C ••••{bankAccount.accountNumber.slice(-4)}</p>
              <p>IFSC: {bankAccount.ifscCode}</p>
              {bankAccount.upiId && <p>UPI: {bankAccount.upiId}</p>}
            </div>
          )}

          {/* UPI QR */}
          {bankAccount && (
            <div className="center text-center">
              <p className="mb-1 font-semibold">{t.scanToPay}</p>
              <QRCodeSVG
                value={upiString}
                size={is2inch ? 90 : 120}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
                marginSize={1}
              />
              <p className="mt-1 text-[9px] text-slate-600">{bankAccount.upiId}</p>
            </div>
          )}

          {/* Signature + Stamp */}
          <div className="mt-4 flex items-end justify-between">
            {businessProfile.stampUrl ? (
              <img src={businessProfile.stampUrl} alt="Stamp" className="h-16 w-16 object-contain" style={{ transform: 'rotate(-12deg)' }} />
            ) : (
              <div className="stamp flex h-14 w-14 items-center justify-center rounded-full border-2 border-sky-500/40 text-center text-[7px] font-bold text-sky-600/60" style={{ transform: 'rotate(-12deg)' }}>
                {businessProfile.businessName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="text-center">
              {businessProfile.signatureUrl ? (
                <img src={businessProfile.signatureUrl} alt="Signature" className="mx-auto mb-1 max-h-12 max-w-[120px] object-contain" />
              ) : (
                <div className="sig-line border-t border-slate-400 pt-0.5" style={{ width: '100px', marginTop: '32px' }} />
              )}
              <p className="text-[8px] text-slate-600">{t.authorizedSignature}</p>
            </div>
          </div>

          <div className="border-top my-2 border-t border-dashed border-slate-300" />

          {/* Footer */}
          <p className="center text-center font-semibold text-[9px]">{t.thankYou}</p>
          <p className="center text-center text-[8px] text-slate-500">Powered by FinanceHub</p>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            {t.closeReceipt}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            🖨️ {t.print}
          </button>
        </div>
      </div>
    </div>
  );
}
