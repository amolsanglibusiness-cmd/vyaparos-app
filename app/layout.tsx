import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppDataProvider } from './banking/app-data-context';
import { SettingsProvider } from './banking/settings-context';
import { MultiUserProvider } from './banking/multi-user-context';
import { AppShell } from './banking/app-shell';
import { InventoryProvider } from '@/src/context/InventoryContext';
import { AuthProvider } from '@/hooks/use-auth';
import { AuthGate } from '@/components/auth-gate';

const inter = Inter({ subsets: ['latin'] });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'FinanceHub — Dashboard, Banking, Savings & Transactions',
  description:
    'Complete financial dashboard with banking, savings, transactions, and POS billing management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <AuthGate>
            <MultiUserProvider>
              <SettingsProvider>
                <AppDataProvider>
                  <InventoryProvider>
                    <AppShell>{children}</AppShell>
                  </InventoryProvider>
                </AppDataProvider>
              </SettingsProvider>
            </MultiUserProvider>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
