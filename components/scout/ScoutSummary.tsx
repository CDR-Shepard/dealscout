"use client";

import { Target, Flame, Clock, BarChart3 } from "lucide-react";

interface ScoutSummaryProps {
  totalScanned: number;
  totalFlagged: number;
  hotDeals: number;
  duration: number;
}

export function ScoutSummary({
  totalScanned,
  totalFlagged,
  hotDeals,
  duration,
}: ScoutSummaryProps) {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="px-3 py-2 border-b border-white/15">
      <div className="grid grid-cols-4 gap-2">
        <SummaryStat
          icon={<BarChart3 className="w-3 h-3 text-ds-blue" />}
          label="Scanned"
          value={totalScanned}
        />
        <SummaryStat
          icon={<Target className="w-3 h-3 text-ds-orange" />}
          label="Flagged"
          value={totalFlagged}
        />
        <SummaryStat
          icon={<Flame className="w-3 h-3 text-ds-red" />}
          label="Hot"
          value={hotDeals}
        />
        <SummaryStat
          icon={<Clock className="w-3 h-3 text-ds-text-muted" />}
          label="Time"
          value={timeStr}
        />
      </div>
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="text-center space-y-0.5">
      <div className="flex justify-center">{icon}</div>
      <div className="font-mono text-sm font-bold text-ds-text">{value}</div>
      <div className="text-[9px] text-ds-text-muted uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
