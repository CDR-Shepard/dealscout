"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Satellite,
  ImageIcon,
} from "lucide-react";
import { useScoutStore, type ScoredProperty } from "@/store/useScoutStore";
import { usePropertyStore } from "@/store/usePropertyStore";

type SortField =
  | "distressScore"
  | "aiConfidence"
  | "listPrice"
  | "estimatedArv"
  | "maxAllowableOffer"
  | "daysOnMls";

function scoreBadgeClass(score: number): string {
  if (score >= 80)
    return "bg-red-100 text-red-800 border-red-200";
  if (score >= 60)
    return "bg-orange-100 text-orange-800 border-orange-200";
  if (score >= 40)
    return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-stone-100 text-stone-500 border-stone-200";
}

function confidenceBadgeClass(confidence: number): string {
  if (confidence >= 80)
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (confidence >= 60)
    return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-stone-50 text-stone-500 border-stone-200";
}

function ExpandedRow({ property }: { property: ScoredProperty }) {
  const [imageView, setImageView] = useState<
    "satellite" | "street" | "photo" | null
  >(null);

  const hasImages =
    property.satelliteUrl || property.streetViewUrl || property.primaryPhoto;

  const imageSrc =
    imageView === "satellite"
      ? property.satelliteUrl
      : imageView === "street"
        ? property.streetViewUrl
        : imageView === "photo"
          ? property.primaryPhoto
          : null;

  return (
    <TableRow className="border-white/10 bg-white/10 hover:bg-white/10">
      <TableCell colSpan={8} className="p-0">
        <div className="px-6 py-4 space-y-3">
          {/* Reasoning */}
          {property.aiReasoning && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ds-text-muted">
                AI Analysis
              </span>
              <p className="text-xs text-ds-text-secondary mt-1 leading-relaxed max-w-3xl">
                {property.aiReasoning}
              </p>
            </div>
          )}

          {/* Distress signals as tags */}
          {property.distressSignals.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ds-text-muted">
                Deferred Maintenance Signals
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {property.distressSignals.map((signal, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Visual analysis if available */}
          {property.visualAnalysis &&
            property.visualAnalysis.score > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ds-text-muted">
                  Visual Inspection
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${scoreBadgeClass(property.visualAnalysis.score)}`}
                  >
                    Visual: {property.visualAnalysis.score}/100
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-ds-border text-ds-text-secondary"
                  >
                    {property.visualAnalysis.condition?.replace("_", " ")}
                  </Badge>
                </div>
                {property.visualAnalysis.signals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {property.visualAnalysis.signals.map((signal, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-orange-50 text-orange-700 border border-orange-200"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                )}
                {property.visualAnalysis.notes && (
                  <p className="text-[10px] text-ds-text-muted mt-1 italic">
                    {property.visualAnalysis.notes}
                  </p>
                )}
              </div>
            )}

          {/* Recommended action */}
          {property.recommendedAction && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ds-text-muted">
                Recommended Action
              </span>
              <p className="text-xs text-ds-amber font-medium mt-1">
                {property.recommendedAction}
              </p>
            </div>
          )}

          {/* Collapsible images */}
          {hasImages && (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ds-text-muted">
                  Images
                </span>
                <div className="flex gap-1 ml-2">
                  {property.satelliteUrl && (
                    <button
                      onClick={() =>
                        setImageView(
                          imageView === "satellite" ? null : "satellite"
                        )
                      }
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                        imageView === "satellite"
                          ? "glass-subtle text-ds-amber"
                          : "text-ds-text-muted hover:text-ds-text hover:bg-white/25"
                      }`}
                    >
                      <Satellite className="w-3 h-3" /> Aerial
                    </button>
                  )}
                  {property.streetViewUrl && (
                    <button
                      onClick={() =>
                        setImageView(
                          imageView === "street" ? null : "street"
                        )
                      }
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                        imageView === "street"
                          ? "glass-subtle text-ds-amber"
                          : "text-ds-text-muted hover:text-ds-text hover:bg-white/25"
                      }`}
                    >
                      <Eye className="w-3 h-3" /> Street
                    </button>
                  )}
                  {property.primaryPhoto && (
                    <button
                      onClick={() =>
                        setImageView(
                          imageView === "photo" ? null : "photo"
                        )
                      }
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                        imageView === "photo"
                          ? "glass-subtle text-ds-amber"
                          : "text-ds-text-muted hover:text-ds-text hover:bg-white/25"
                      }`}
                    >
                      <ImageIcon className="w-3 h-3" /> Photo
                    </button>
                  )}
                </div>
              </div>
              {imageSrc && (
                <div className="mt-2 rounded-xl overflow-hidden glass-subtle max-w-md">
                  <img
                    src={imageSrc}
                    alt={`${imageView} view of ${property.address}`}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ResultsTable() {
  const { properties } = useScoutStore();
  const { openDrawer } = usePropertyStore();
  const [sortField, setSortField] = useState<SortField>("distressScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const flagged = properties.filter((p) => p.distressScore >= 40);
  const sorted = [...(showAll ? properties : flagged)].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    return sortDir === "desc"
      ? (bVal as number) - (aVal as number)
      : (aVal as number) - (bVal as number);
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === "desc" ? (
        <ChevronDown className="w-3 h-3 inline ml-0.5" />
      ) : (
        <ChevronUp className="w-3 h-3 inline ml-0.5" />
      )
    ) : null;

  const exportCsv = () => {
    const headers = [
      "Score",
      "Confidence",
      "Address",
      "City",
      "State",
      "Zip",
      "Price",
      "ARV",
      "MAO",
      "Type",
      "Signals",
      "Reasoning",
    ];
    const rows = sorted.map((p) =>
      [
        p.distressScore,
        p.aiConfidence ?? "",
        `"${p.address}"`,
        p.city,
        p.state,
        p.zipCode,
        p.listPrice ?? "",
        p.estimatedArv ?? "",
        p.maxAllowableOffer ?? "",
        p.investmentType ?? "",
        `"${(p.distressSignals || []).join("; ")}"`,
        `"${(p.aiReasoning || "").replace(/"/g, '""')}"`,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dealscout-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (properties.length === 0) return null;

  return (
    <div className="glass-elevated border-t border-white/20">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/15">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-ds-text">
            {sorted.length} properties
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] h-6 text-ds-text-muted hover:text-ds-text"
            onClick={() => setShowAll((s) => !s)}
          >
            {showAll ? "Flagged Only" : "Show All"}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] h-6 text-ds-text-muted hover:text-ds-text"
          onClick={exportCsv}
        >
          <Download className="w-3 h-3 mr-1" />
          CSV
        </Button>
      </div>

      <div className="max-h-[350px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="w-8" />
              <TableHead
                className="text-[10px] text-ds-text-muted cursor-pointer w-16 font-semibold uppercase tracking-wider"
                onClick={() => toggleSort("distressScore")}
              >
                Score
                <SortIcon field="distressScore" />
              </TableHead>
              <TableHead
                className="text-[10px] text-ds-text-muted cursor-pointer w-16 font-semibold uppercase tracking-wider"
                onClick={() => toggleSort("aiConfidence")}
              >
                Conf.
                <SortIcon field="aiConfidence" />
              </TableHead>
              <TableHead className="text-[10px] text-ds-text-muted font-semibold uppercase tracking-wider">
                Address
              </TableHead>
              <TableHead className="text-[10px] text-ds-text-muted font-semibold uppercase tracking-wider">
                Signals
              </TableHead>
              <TableHead
                className="text-[10px] text-ds-text-muted cursor-pointer font-semibold uppercase tracking-wider"
                onClick={() => toggleSort("listPrice")}
              >
                Price
                <SortIcon field="listPrice" />
              </TableHead>
              <TableHead
                className="text-[10px] text-ds-text-muted cursor-pointer font-semibold uppercase tracking-wider"
                onClick={() => toggleSort("maxAllowableOffer")}
              >
                MAO
                <SortIcon field="maxAllowableOffer" />
              </TableHead>
              <TableHead className="text-[10px] text-ds-text-muted font-semibold uppercase tracking-wider">
                Type
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.slice(0, 100).map((p) => {
              const rowId = p.id || p.propertyId;
              const isExpanded = expandedIds.has(rowId);
              const signalCount = (p.distressSignals || []).length;
              const topSignals = (p.distressSignals || []).slice(0, 2);

              return (
                <>
                  <TableRow
                    key={rowId}
                    className={`border-white/10 cursor-pointer transition-colors ${
                      isExpanded
                        ? "bg-white/25"
                        : "hover:bg-white/15"
                    }`}
                    onClick={() => toggleExpand(rowId)}
                  >
                    <TableCell className="py-1.5 w-8 pr-0">
                      <ChevronRight
                        className={`w-3.5 h-3.5 text-ds-text-muted transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] font-bold ${scoreBadgeClass(p.distressScore)}`}
                      >
                        {p.distressScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      {p.aiConfidence != null && (
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] ${confidenceBadgeClass(p.aiConfidence)}`}
                        >
                          {p.aiConfidence}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-ds-text py-1.5">
                      <button
                        className="text-left hover:underline decoration-ds-amber/40"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDrawer(p);
                        }}
                      >
                        {p.address}
                      </button>
                      <span className="text-ds-text-muted ml-1 text-[10px]">
                        {p.city}, {p.state}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 max-w-[200px]">
                      <div className="flex items-center gap-1">
                        {topSignals.map((s, i) => (
                          <span
                            key={i}
                            className="inline-block px-1.5 py-0 rounded text-[9px] bg-amber-50 text-amber-700 border border-amber-200 truncate max-w-[90px]"
                          >
                            {s}
                          </span>
                        ))}
                        {signalCount > 2 && (
                          <span className="text-[9px] text-ds-text-muted">
                            +{signalCount - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-ds-text py-1.5">
                      {p.listPrice
                        ? `$${(p.listPrice / 1000).toFixed(0)}k`
                        : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-ds-amber font-medium py-1.5">
                      {p.maxAllowableOffer
                        ? `$${(p.maxAllowableOffer / 1000).toFixed(0)}k`
                        : "-"}
                    </TableCell>
                    <TableCell className="py-1.5">
                      {p.investmentType && p.investmentType !== "pass" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] border-ds-border text-ds-text-secondary"
                        >
                          {p.investmentType.replace("_", " & ")}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <ExpandedRow key={`${rowId}-expanded`} property={p} />
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
