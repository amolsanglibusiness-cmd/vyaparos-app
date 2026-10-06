'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

import { useSettings } from './settings-context';

function getGreetingKey(hour: number): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  if (hour < 12) return 'goodMorning';
  if (hour < 17) return 'goodAfternoon';
  return 'goodEvening';
}

export function GreetingCard() {
  const { t, businessProfile } = useSettings();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const greetingKey = getGreetingKey(now.getHours());
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const firstName = (businessProfile.ownerName || 'User').trim().split(/\s+/)[0] || 'User';
  return (
    <div className="animate-fade-in-up flex min-h-[72px] items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card px-3 shadow-sm sm:h-auto sm:min-h-16 sm:p-4">
      <div className="flex min-w-0 items-center gap-2">
        {businessProfile.businessLogoUrl ? (
          <img src={businessProfile.businessLogoUrl} alt="Business logo" className="h-9 w-9 shrink-0 rounded-xl object-contain sm:h-10 sm:w-10" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md sm:h-10 sm:w-10">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-tight sm:text-xl">{t[greetingKey]} {firstName}!</h2>
          <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{dateStr}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success sm:h-2 sm:w-2" />
        <span className="font-mono text-[10px] font-bold tabular-nums tracking-tight sm:text-sm">{timeStr}</span>
      </div>
    </div>
  );
}
