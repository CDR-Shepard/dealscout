"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScoutLogEntry } from "@/store/useScoutStore";

const ICONS: Record<ScoutLogEntry["type"], string> = {
  info: "\u{1F50D}",
  success: "\u2705",
  warning: "\u26A0\uFE0F",
  error: "\u274C",
  hot_deal: "\u{1F525}",
};

const COLORS: Record<ScoutLogEntry["type"], string> = {
  info: "text-ds-text-secondary",
  success: "text-ds-green",
  warning: "text-ds-orange",
  error: "text-ds-red",
  hot_deal: "text-ds-red font-semibold",
};

export function ActivityFeed({ entries }: { entries: ScoutLogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-ds-text-muted text-xs text-center">
          Enter a location or draw an area to begin scouting
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-1.5">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 mt-0.5 w-4 text-center">
              {ICONS[entry.type]}
            </span>
            <span className={COLORS[entry.type]}>{entry.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
