"use client";

import { Progress } from "@/components/ui/progress";
import { useScoutStore } from "@/store/useScoutStore";

export function ProgressBar() {
  const { progress, currentBatch, totalBatches } = useScoutStore();

  return (
    <div className="px-3 py-2 border-b border-ds-border space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-ds-text-secondary">
        <span>
          Batch {currentBatch}/{totalBatches}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-1.5 bg-ds-border [&>div]:bg-ds-amber" />
    </div>
  );
}
