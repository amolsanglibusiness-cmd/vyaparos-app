'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeftRight,
    Banknote,
    FilePlus2,
    Landmark,
    Package,
    UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileFabProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string; // Optional केले आहे जेणेकरून undefined आले तरी क्रॅश होणार नाही
    className?: string;
}

function EntryIcon({ label = '' }: { label?: string }) {
    const value = label.trim().toLowerCase();

    if (
        value.includes('party') ||
        value.includes('customer') ||
        value.includes('supplier') ||
        value.includes('पक्ष') ||
        value.includes('ग्राहक') ||
        value.includes('पुरवठादार')
    ) {
        return (
            <UserRound
                className="h-6 w-6 shrink-0 text-white"
                strokeWidth={2.1}
                aria-hidden="true"
            />
        );
    }

    if (
        value.includes('bank') ||
        value.includes('account') ||
        value.includes('बँक') ||
        value.includes('खाते')
    ) {
        return (
            <Landmark
                className="h-6 w-6 shrink-0 text-white"
                strokeWidth={2.1}
                aria-hidden="true"
            />
        );
    }

    if (
        value.includes('item') ||
        value.includes('inventory') ||
        value.includes('वस्तू') ||
        value.includes('इन्व्हेंटरी')
    ) {
        return (
            <Package
                className="h-6 w-6 shrink-0 text-white"
                strokeWidth={2.1}
                aria-hidden="true"
            />
        );
    }

    if (
        value.includes('cash') ||
        value.includes('रोख') ||
        value.includes('galla') ||
        value.includes('गल्ला')
    ) {
        return (
            <Banknote
                className="h-6 w-6 shrink-0 text-white"
                strokeWidth={2.1}
                aria-hidden="true"
            />
        );
    }

    if (
        value.includes('sale') ||
        value.includes('invoice') ||
        value.includes('बिल') ||
        value.includes('विक्री')
    ) {
        return (
            <FilePlus2
                className="h-6 w-6 shrink-0 text-white"
                strokeWidth={2.1}
                aria-hidden="true"
            />
        );
    }

    return (
        <ArrowLeftRight
            className="h-6 w-6 shrink-0 text-white"
            strokeWidth={2.1}
            aria-hidden="true"
        />
    );
}

export const MobileFab = React.forwardRef<HTMLButtonElement, MobileFabProps>(
    ({ label = '', onClick, className, ...props }, ref) => {
        const [visible, setVisible] = useState(true);

        const shortLabel = useMemo(() => {
            const value = label.trim();
            return value
                .replace(/^Add New Party$/i, 'Add Party')
                .replace(/^Add New Customer$/i, 'Add Customer')
                .replace(/^Add New Supplier$/i, 'Add Supplier')
                .replace(/^Add New Item$/i, 'Add Item')
                .replace(/^Create Invoice Sale$/i, 'Sale')
                .replace(/^Create Invoice \/ Sale$/i, 'Sale')
                .replace(/^Create New Sale$/i, 'Sale')
                .replace(/^Add Cash Entry$/i, 'Cash Entry')
                .replace(/^Add Bank Account$/i, 'Bank')
                .replace(/^Add Bank \/ Account$/i, 'Bank')
                .replace(/^Add Transaction$/i, 'Transaction')
                .replace(/^Add Entry$/i, 'Entry');
        }, [label]);

        useEffect(() => {
            let lastTop = window.scrollY;
            const onScroll = () => {
                const top = Math.max(0, window.scrollY || 0);
                const delta = top - lastTop;
                if (Math.abs(delta) < 3) return;
                setVisible(delta < 0 || top <= 4);
                lastTop = top;
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            return () => window.removeEventListener('scroll', onScroll);
        }, []);

        return (
            <button
                ref={ref}
                type="button"
                onClick={onClick}
                aria-label={shortLabel}
                className={cn(
                    'fixed bottom-[calc(5.15rem+env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2',
                    'inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full',
                    'bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 px-6 py-3 text-sm font-semibold leading-none !text-white',
                    '[&_*]:!text-white',
                    'shadow-xl shadow-blue-500/30 hover:from-sky-600 hover:via-blue-700 hover:to-violet-700',
                    'border border-sky-300/70 transition-all duration-200 active:scale-95 lg:hidden vy-mobile-fab',
                    visible
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-[5.5rem] opacity-0',
                    className
                )}
                {...props}
            >
                <EntryIcon label={label} />
                <span className="whitespace-nowrap">{shortLabel}</span>
            </button>
        );
    }
);

MobileFab.displayName = 'MobileFab';