'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Phone,
  MapPin,
  Download,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

type PublicEntry = {
  id: string;
  type: 'Given' | 'Received';
  amount: number;
  description: string;
  date: string;
  createdAt?: string;
};

type PublicInvoice = {
  id: string;
  invoiceNumber: string;
  items: Array<{
    product?: { name?: string; price?: number; unit?: string };
    quantity?: number;
    taxRate?: number;
    taxAmount?: number;
    lineAmount?: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  date: string;
  paymentStatus: 'Paid' | 'Pending';
  balanceDue: number;
  description?: string;
};

type BusinessSnapshot = {
  ownerName?: string;
  owner_name?: string;
  businessName?: string;
  business_name?: string;
  businessAddress?: string;
  business_address?: string;
  phone?: string;
  phone_number?: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  businessLogoUrl?: string | null;
  business_logo_url?: string | null;
};

type PaymentSnapshot = {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
} | null;

type ShareData = {
  ok: boolean;
  party?: {
    name: string;
    type: string;
    phone: string;
    email?: string;
    address?: string;
    upiId?: string;
    openingBalance?: number;
  };
  business?: BusinessSnapshot;
  payment?: PaymentSnapshot;
  entries?: PublicEntry[];
  invoices?: PublicInvoice[];
  error?: string;
};

const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const dateText = (v: string) =>
  new Date(v).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const buildUpiLink = (upiId: string, businessName: string, amount: number, customerName: string) => {
  if (!upiId || amount <= 0) return '';
  const params = new URLSearchParams({
    pa: upiId,
    pn: businessName || 'Business',
    am: amount.toFixed(2),
    cu: 'INR',
    tn: `Payment - ${customerName}`.slice(0, 80),
  });
  return `upi://pay?${params.toString()}`;
};

export default function LedgerClient({ token }: { token: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBillsSection, setShowBillsSection] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: result, error } = await supabase.rpc('get_public_customer_ledger', {
        p_token: token,
      });
      if (error) setData({ ok: false, error: error.message });
      else setData(result as ShareData);
      setLoading(false);
    })();
  }, [token]);

  const entries = data?.entries || [];
  const invoices = data?.invoices || [];

  const ledgerRows = useMemo(() => {
    let running = Number(data?.party?.openingBalance || 0);
    const chronological = [...entries].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });

    const rows = chronological.map((entry) => {
      const debit = entry.type === 'Given' ? Number(entry.amount) : 0;
      const credit = entry.type === 'Received' ? Number(entry.amount) : 0;
      running += debit - credit;
      return { entry, debit, credit, balance: running };
    });

    return rows.reverse();
  }, [entries, data?.party?.openingBalance]);

  const totals = useMemo(() => {
    const given = entries
      .filter((e) => e.type === 'Given')
      .reduce((s, e) => s + Number(e.amount), 0);
    const received = entries
      .filter((e) => e.type === 'Received')
      .reduce((s, e) => s + Number(e.amount), 0);
    const opening = Number(data?.party?.openingBalance || 0);
    return { given, received, opening, balance: opening + given - received };
  }, [entries, data?.party?.openingBalance]);

  // Business properties with fallbacks for both camelCase and snake_case
  const business = data?.business || {};
  const businessName =
    business.businessName ||
    business.business_name ||
    business.ownerName ||
    business.owner_name ||
    'व्यवसाय';

  const businessAddress = business.businessAddress || business.business_address || '';
  const businessPhone = business.phone || business.phone_number || business.mobile || '';
  const businessLogoUrl = business.businessLogoUrl || business.business_logo_url || null;

  const payment = data?.payment || null;
  const outstanding = Math.max(0, totals.balance);
  const upiLink = buildUpiLink(
    payment?.upiId || '',
    businessName,
    outstanding,
    data?.party?.name || 'Customer'
  );

  const dateRangeText = useMemo(() => {
    if (ledgerRows.length === 0) return '';
    const firstDate = dateText(ledgerRows[ledgerRows.length - 1]?.entry.date || '');
    const lastDate = dateText(ledgerRows[0]?.entry.date || '');
    return `(${firstDate} - ${lastDate})`;
  }, [ledgerRows]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading customer ledger…
      </main>
    );
  }

  if (!data?.ok || !data.party) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Ledger Link Expired or Invalid</h1>
          <p className="mt-2 text-sm text-slate-500">
            {data?.error || 'ही लिंक कालबाह्य झाली असू शकते.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-2 py-3 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        
        {/* 1. DYNAMIC BUSINESS HEADER SECTION WITH CALL LOGO */}
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            
            {/* LOGO & BUSINESS INFO */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-500 bg-emerald-50 p-0.5 shadow-sm">
                {businessLogoUrl ? (
                  <img
                    src={businessLogoUrl}
                    alt={businessName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-black text-emerald-700">
                    {businessName.trim().slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-black text-slate-900 truncate">
                  {businessName}
                </h1>
                {businessAddress && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{businessAddress}</span>
                  </p>
                )}
                {businessPhone && (
                  <a
                    href={`tel:${businessPhone}`}
                    className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-600 transition"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{businessPhone}</span>
                  </a>
                )}
              </div>
            </div>

            {/* CALL BUTTON LOGO ON RIGHT SIDE */}
            {businessPhone ? (
              <a
                href={`tel:${businessPhone}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition active:scale-95"
                title="Call Business"
              >
                <Phone className="h-5 w-5" />
              </a>
            ) : null}

          </div>
        </header>

        {/* 2. VYAPAROS ADVERTISEMENT IMAGE BANNER */}
        <section className="px-3 py-2 sm:px-5">
          <a
            href="https://vyaparos-app.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-xl shadow-xs transition hover:opacity-95"
          >
            <img
              src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjyLRxwpGPLrzTadNF7RuELn2aTNRgqLTW-My456G4tPKHc6Yf-5nt1COnFESz3IFn_vdcJuD-9kcoyTCJr3couwcz7wIMg6oixfMGdksTq8-2S4Ydn_bnikE4FXdiZtdWj9iTq5uLcDqoHR9S96ViDOd8siZ7V1WVqXBiMeEbsztSS15lj4TDVzfsTr3S6/w640-h162/Vyapar%20os.png"
              alt="VyaparOS Banner"
              className="w-full object-cover rounded-xl"
            />
          </a>
        </section>

        {/* 3. TRANSACTION HISTORY SECTION */}
        <section className="px-3 sm:px-5">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            
            {/* CENTERED SMALL GREY TRANSACTION HISTORY TITLE */}
            <div className="text-center border-b border-slate-100 pb-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Transaction History
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div>
                {/* Client Name */}
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {data.party.name}
                </h2>

                {/* Date Range */}
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {dateRangeText}
                </p>

                {/* View Bills & Receipts Small Button */}
                <button
                  type="button"
                  onClick={() => setShowBillsSection(!showBillsSection)}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition"
                >
                  <FileText className="h-3 w-3" />
                  <span>View Bills & Receipts</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {/* Clickable QR Code for Mobile UPI Payment */}
              {payment?.upiId && upiLink ? (
                <div className="flex flex-col items-center shrink-0">
                  <a
                    href={upiLink}
                    target="_blank"
                    rel="noreferrer"
                    title="Click to Pay via UPI"
                    className="block rounded-lg border border-slate-300 bg-white p-1.5 shadow-xs hover:border-blue-500 transition active:scale-95"
                  >
                    <QRCodeSVG value={upiLink} size={64} />
                  </a>
                  <a
                    href={upiLink}
                    className="mt-1 rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white hover:bg-blue-700"
                  >
                    Scan / Tap to Pay
                  </a>
                </div>
              ) : null}
            </div>

            {/* 4. TOTALS SUMMARY BOX (TOTAL DEBIT -> TOTAL CREDIT -> NET BALANCE) */}
            <div className="mt-3 grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 text-center">
              <div>
                <p className="text-[11px] font-semibold text-slate-600">Total Debit(-)</p>
                <p className="text-sm sm:text-base font-black text-red-600">{money(totals.given)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-600">Total Credit(+)</p>
                <p className="text-sm sm:text-base font-black text-emerald-600">{money(totals.received)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-600">Net Balance</p>
                <p className={`text-sm sm:text-base font-black ${totals.balance > 0 ? 'text-red-600' : totals.balance < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {money(Math.abs(totals.balance))} {totals.balance > 0 ? 'Dr' : totals.balance < 0 ? 'Cr' : ''}
                </p>
              </div>
            </div>

            {/* 5. LEDGER TABLE */}
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] bg-blue-50/70 text-[11px] font-extrabold text-slate-700 border-b border-slate-200">
                <span className="px-2 py-2">Date</span>
                <span className="px-2 py-2 text-right">Debit(-)</span>
                <span className="px-2 py-2 text-right">Credit(+)</span>
                <span className="px-2 py-2 text-right">Balance</span>
              </div>

              {ledgerRows.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-500">कोणतेही व्यवहार उपलब्ध नाहीत</div>
              ) : (
                ledgerRows.map(({ entry, debit, credit, balance }, index) => (
                  <div key={entry.id} className="grid grid-cols-[1fr_1fr_1fr_1fr] border-b border-slate-100 text-xs font-semibold last:border-b-0 hover:bg-slate-50">
                    <div className="px-2 py-2 text-slate-700">
                      {index === 0 && <span className="block text-[9px] font-bold text-red-500 uppercase">Latest</span>}
                      {dateText(entry.date)}
                    </div>
                    <div className="px-2 py-2 text-right font-bold text-red-600">
                      {debit ? money(debit).replace('₹', '') : '-'}
                    </div>
                    <div className="px-2 py-2 text-right font-bold text-emerald-600">
                      {credit ? money(credit).replace('₹', '') : '-'}
                    </div>
                    <div className="px-2 py-2 text-right font-extrabold text-red-600">
                      {money(Math.abs(balance)).replace('₹', '')} {balance > 0 ? 'Dr' : balance < 0 ? 'Cr' : ''}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 6. DOWNLOAD LEDGER BUTTON */}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Ledger</span>
              </button>
            </div>
          </div>
        </section>

        {/* 7. EXPANDABLE BILLS & RECEIPTS SECTION */}
        {showBillsSection && invoices.length > 0 && (
          <section className="px-3 pb-4 pt-2 sm:px-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <h3 className="mb-2 text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-600" /> Bills & Receipts List
              </h3>
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{invoice.invoiceNumber}</span>
                      <span className={invoice.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-red-600'}>
                        {money(invoice.total)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{dateText(invoice.date)}</span>
                      <span>{invoice.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}