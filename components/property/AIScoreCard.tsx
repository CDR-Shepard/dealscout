"use client";

import { Badge } from "@/components/ui/badge";
import type { ScoredProperty } from "@/store/useScoutStore";

function scoreLabel(score: number): string {
  if (score >= 80) return "HOT DEAL";
  if (score >= 60) return "STRONG LEAD";
  if (score >= 40) return "INVESTIGATE";
  return "PASS";
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-red-600 text-white";
  if (score >= 60) return "bg-orange-500 text-white";
  if (score >= 40) return "bg-amber-500 text-white";
  return "bg-stone-400 text-white";
}

function scoreGlow(score: number): string {
  if (score >= 80) return "shadow-[0_0_24px_rgba(220,38,38,0.3)]";
  if (score >= 60) return "shadow-[0_0_18px_rgba(234,88,12,0.2)]";
  return "";
}

export function AIScoreCard({ property }: { property: ScoredProperty }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-ds-text uppercase tracking-wider">
          Distress Score
        </h3>
        {property.aiConfidence != null && (
          <span className="text-[10px] text-ds-text-muted">
            {property.aiConfidence}% confident
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Score badge */}
        <div
          className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-mono backdrop-blur-sm ${scoreColor(property.distressScore)} ${scoreGlow(property.distressScore)} ${property.distressScore >= 80 ? "animate-pulse-glow" : ""}`}
          style={
            property.distressScore >= 80
              ? ({ "--glow-color": "rgba(220,38,38,0.25)" } as React.CSSProperties)
              : undefined
          }
        >
          <span className="text-2xl font-black leading-none">
            {property.distressScore}
          </span>
          <span className="text-[8px] font-semibold mt-0.5 uppercase opacity-80">
            /100
          </span>
        </div>

        <div className="flex-1 space-y-1">
          <div className="text-sm font-semibold text-ds-text">
            {scoreLabel(property.distressScore)}
          </div>
          {property.investmentType && property.investmentType !== "pass" && (
            <Badge
              variant="outline"
              className="text-[10px] border-ds-amber/30 text-ds-amber"
            >
              {property.investmentType.replace("_", " & ").toUpperCase()}
            </Badge>
          )}
          {property.recommendedAction && (
            <p className="text-[10px] text-ds-text-muted line-clamp-2">
              {property.recommendedAction}
            </p>
          )}
        </div>
      </div>

      {/* Distress signals */}
      {property.distressSignals.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {property.distressSignals.map((signal, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-[9px] border-ds-border text-ds-text-secondary bg-ds-bg"
            >
              {signal}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
