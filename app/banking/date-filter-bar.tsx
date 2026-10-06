'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useSettings } from './settings-context';
import { type DateFilterPreset, useDateFilter } from './use-date-filter';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const presetButtons: { preset: DateFilterPreset; labelKey: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' }[] = [
  { preset: 'today', labelKey: 'today' },
  { preset: 'yesterday', labelKey: 'yesterday' },
  { preset: 'thisWeek', labelKey: 'thisWeek' },
  { preset: 'thisMonth', labelKey: 'thisMonth' },
];

export function DateFilterBar() {
  const { t } = useSettings();
  const { preset, setPreset, setCustomRange, customStart, customEnd, range } = useDateFilter();
  const [customOpen, setCustomOpen] = useState(false);
  const [tempStart, setTempStart] = useState(customStart);
  const [tempEnd, setTempEnd] = useState(customEnd);

  useEffect(() => {
    setTempStart(customStart);
    setTempEnd(customEnd);
  }, [customStart, customEnd]);

  const rangeLabel = `${range.start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — ${range.end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const handleApplyCustom = () => {
    if (!tempStart || !tempEnd) return;
    if (tempStart > tempEnd) return;
    setCustomRange(tempStart, tempEnd);
    setCustomOpen(false);
  };

  return (
    <div className="vy-ref-date-filter animate-fade-in flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="vy-ref-date-filter-options flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
        {presetButtons.map((btn) => (
          <button
            key={btn.preset}
            onClick={() => setPreset(btn.preset)}
            className={cn(
              'vy-ref-date-preset shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              preset === btn.preset
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {t[btn.labelKey]}
          </button>
        ))}

        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'vy-ref-date-preset flex shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                preset === 'custom'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {t.customRange}
              <ChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-3 p-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t.startDate}</label>
                <Input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t.endDate}</label>
                <Input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                />
              </div>
              <Button size="sm" className="w-full" onClick={handleApplyCustom} disabled={!tempStart || !tempEnd || tempStart > tempEnd}>
                Apply Range
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="vy-ref-date-range shrink-0 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {rangeLabel}
      </div>
    </div>
  );
}
