"use client";

import type { ScoredProperty } from "@/store/useScoutStore";

function formatMoney(val: number | null): string {
  if (val == null) return "-";
  return `$${val.toLocaleString()}`;
}

export function DealNumbersCard({ property }: { property: ScoredProperty }) {
  const repairMid =
    property.repairCostLow != null && property.repairCostHigh != null
      ? Math.round((property.repairCostLow + property.repairCostHigh) / 2)
      : null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-ds-text uppercase tracking-wider">
        Deal Numbers
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <NumberBox
          label="List Price"
          value={formatMoney(property.listPrice)}
          variant="neutral"
        />
        <NumberBox
          label="Est. ARV"
          value={formatMoney(property.estimatedArv)}
          variant="green"
        />
        <NumberBox
          label="Repairs"
          value={
            property.repairCostLow != null && property.repairCostHigh != null
              ? `${formatMoney(property.repairCostLow)} - ${formatMoney(property.repairCostHigh)}`
              : "-"
          }
          sub={property.repairLevel ?? undefined}
          variant="orange"
        />
        <NumberBox
          label="MAO (70% Rule)"
          value={formatMoney(property.maxAllowableOffer)}
          variant="blue"
        />
        <NumberBox
          label="Wholesale Fee Est."
          value={formatMoney(property.wholesaleFeeEst)}
          variant="green"
        />
        <NumberBox
          label="Flip Profit Est."
          value={formatMoney(property.flipProfitEst)}
          variant="green"
        />
      </div>
    </div>
  );
}

function NumberBox({
  label,
  value,
  sub,
  variant = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  variant?: "neutral" | "green" | "orange" | "blue";
}) {
  const borderColors = {
    neutral: "border-ds-border",
    green: "border-ds-green/20",
    orange: "border-ds-orange/20",
    blue: "border-ds-blue/20",
  };
  const valueColors = {
    neutral: "text-ds-text",
    green: "text-ds-green",
    orange: "text-ds-orange",
    blue: "text-ds-blue",
  };

  return (
    <div
      className={`rounded-md border p-2 bg-ds-bg ${borderColors[variant]}`}
    >
      <div className="text-[9px] text-ds-text-muted uppercase tracking-wider">
        {label}
      </div>
      <div className={`font-mono text-sm font-bold ${valueColors[variant]}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[9px] text-ds-text-muted capitalize">{sub}</div>
      )}
    </div>
  );
}
