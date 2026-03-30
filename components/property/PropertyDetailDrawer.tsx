"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Home,
  BedDouble,
  Bath,
  Ruler,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Save,
  X,
  Satellite,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { usePropertyStore } from "@/store/usePropertyStore";
import { AIScoreCard } from "./AIScoreCard";
import { DealNumbersCard } from "./DealNumbersCard";

export function PropertyDetailDrawer() {
  const { selectedProperty: property, drawerOpen, closeDrawer } =
    usePropertyStore();

  if (!property) return null;

  const saveToPipeline = async () => {
    try {
      await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: property.address,
          city: property.city,
          state: property.state,
          zipCode: property.zipCode,
          latitude: property.latitude,
          longitude: property.longitude,
          listPrice: property.listPrice,
          estimatedArv: property.estimatedArv,
          maxAllowableOffer: property.maxAllowableOffer,
          distressScore: property.distressScore,
          investmentType: property.investmentType,
          aiReasoning: property.aiReasoning,
          distressSignals: JSON.stringify(property.distressSignals),
          primaryPhoto: property.primaryPhoto,
        }),
      });
    } catch {
      // handle error
    }
  };

  return (
    <Sheet open={drawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent
        side="right"
        className="w-[480px] sm:max-w-[480px] p-0 glass-elevated !rounded-l-2xl border-l border-white/20"
      >
        <SheetHeader className="px-4 pt-4 pb-2">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-ds-text text-sm font-semibold">
                {property.address}
              </SheetTitle>
              <p className="text-ds-text-secondary text-xs mt-0.5">
                {property.city}, {property.state} {property.zipCode}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeDrawer}
              className="text-ds-text-muted hover:text-ds-text h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="px-4 pb-6 space-y-4">
            {/* Image viewer: Satellite / Street View / Photo */}
            <PropertyImageViewer property={property} />

            {/* Source badge */}
            {property.source && property.source !== "for_sale" && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    property.source === "off_market"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : property.source === "stale_sold"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : property.source === "foreclosure"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "border-ds-border text-ds-text-secondary"
                  }`}
                >
                  {property.source === "off_market"
                    ? "OFF-MARKET"
                    : property.source === "stale_sold"
                      ? `STALE OWNER (${property.yearsSinceSale?.toFixed(0)}yr)`
                      : property.source === "foreclosure"
                        ? "FORECLOSURE"
                        : property.source?.toUpperCase()}
                </Badge>
              </div>
            )}

            {/* Visual analysis results */}
            {property.visualAnalysis && property.visualAnalysis.score > 0 && (
              <div className="rounded-xl border border-orange-200/40 bg-orange-50/50 backdrop-blur-sm p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-ds-orange" />
                  <span className="text-xs font-semibold text-ds-orange">
                    Visual Distress: {property.visualAnalysis.score}/100
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] border-orange-200 text-ds-orange ml-auto"
                  >
                    {property.visualAnalysis.condition?.replace("_", " ")}
                  </Badge>
                </div>
                {property.visualAnalysis.signals.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {property.visualAnalysis.signals.map((signal, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[9px] border-ds-border text-ds-text-secondary"
                      >
                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5 text-ds-orange" />
                        {signal}
                      </Badge>
                    ))}
                  </div>
                )}
                {property.visualAnalysis.notes && (
                  <p className="text-[10px] text-ds-text-muted italic">
                    {property.visualAnalysis.notes}
                  </p>
                )}
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-2">
              <QuickStat icon={<BedDouble className="w-3 h-3" />} label="Beds" value={property.beds ?? "-"} />
              <QuickStat icon={<Bath className="w-3 h-3" />} label="Baths" value={property.baths ?? "-"} />
              <QuickStat icon={<Ruler className="w-3 h-3" />} label="Sqft" value={property.sqft?.toLocaleString() ?? "-"} />
              <QuickStat icon={<Calendar className="w-3 h-3" />} label="Built" value={property.yearBuilt ?? "-"} />
            </div>

            <Separator className="bg-ds-border" />

            {/* AI Score Card */}
            <AIScoreCard property={property} />

            <Separator className="bg-ds-border" />

            {/* Deal Numbers */}
            <DealNumbersCard property={property} />

            <Separator className="bg-ds-border" />

            {/* Property Details */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-ds-text uppercase tracking-wider">
                Details
              </h3>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <Detail icon={<Home />} label="Type" value={property.propertyType ?? "-"} />
                <Detail icon={<Clock />} label="Days on MLS" value={property.daysOnMls ?? "-"} />
                <Detail icon={<DollarSign />} label="List Price" value={property.listPrice ? `$${property.listPrice.toLocaleString()}` : "-"} />
                <Detail icon={<TrendingUp />} label="Price/sqft" value={property.sqft && property.listPrice ? `$${Math.round(property.listPrice / property.sqft)}` : "-"} />
              </div>
            </div>

            {/* AI Reasoning */}
            {property.aiReasoning && (
              <>
                <Separator className="bg-ds-border" />
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-ds-text uppercase tracking-wider">
                    AI Analysis
                  </h3>
                  <p className="text-xs text-ds-text-secondary leading-relaxed">
                    {property.aiReasoning}
                  </p>
                </div>
              </>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={saveToPipeline}
                className="flex-1 bg-ds-amber hover:bg-ds-amber/90 text-white text-xs h-9 rounded-xl shadow-lg shadow-ds-amber/15"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save to Pipeline
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function QuickStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass-subtle rounded-xl p-2 text-center space-y-0.5">
      <div className="flex justify-center text-ds-text-muted">{icon}</div>
      <div className="font-mono text-sm font-bold text-ds-text">{value}</div>
      <div className="text-[9px] text-ds-text-muted uppercase">{label}</div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-1.5 text-ds-text-secondary">
      <span className="w-3 h-3 text-ds-text-muted">{icon}</span>
      <span className="text-ds-text-muted">{label}:</span>
      <span className="text-ds-text">{value}</span>
    </div>
  );
}

function PropertyImageViewer({ property }: { property: import("@/store/useScoutStore").ScoredProperty }) {
  const [view, setView] = useState<"satellite" | "street" | "photo">(
    property.satelliteUrl ? "satellite" : property.primaryPhoto ? "photo" : "satellite"
  );

  const imageSrc =
    view === "satellite"
      ? property.satelliteUrl
      : view === "street"
        ? property.streetViewUrl
        : property.primaryPhoto;

  const hasMultipleViews =
    [property.satelliteUrl, property.streetViewUrl, property.primaryPhoto].filter(
      Boolean
    ).length > 1;

  if (!imageSrc && !property.satelliteUrl && !property.streetViewUrl && !property.primaryPhoto) {
    return (
      <div className="rounded-xl h-48 glass-subtle flex items-center justify-center">
        <p className="text-xs text-ds-text-muted">No imagery available</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="relative rounded-xl overflow-hidden h-48 glass-subtle">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`${view} view of ${property.address}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-ds-text-muted">No {view} view available</p>
          </div>
        )}
        {/* View label */}
        <div className="absolute top-2 left-2">
          <Badge className="text-[9px] bg-white/90 text-ds-text border-none backdrop-blur-sm shadow-sm">
            {view === "satellite" ? (
              <><Satellite className="w-2.5 h-2.5 mr-1" /> Aerial</>
            ) : view === "street" ? (
              <><Eye className="w-2.5 h-2.5 mr-1" /> Street View</>
            ) : (
              <>Photo</>
            )}
          </Badge>
        </div>
      </div>
      {/* View toggle buttons */}
      {hasMultipleViews && (
        <div className="flex gap-1">
          {property.satelliteUrl && (
            <button
              onClick={() => setView("satellite")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all ${
                view === "satellite"
                  ? "glass-subtle text-ds-amber"
                  : "text-ds-text-muted hover:text-ds-text hover:bg-white/25"
              }`}
            >
              <Satellite className="w-3 h-3" /> Aerial
            </button>
          )}
          {property.streetViewUrl && (
            <button
              onClick={() => setView("street")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all ${
                view === "street"
                  ? "glass-subtle text-ds-amber"
                  : "text-ds-text-muted hover:text-ds-text hover:bg-white/25"
              }`}
            >
              <Eye className="w-3 h-3" /> Street
            </button>
          )}
          {property.primaryPhoto && (
            <button
              onClick={() => setView("photo")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all ${
                view === "photo"
                  ? "glass-subtle text-ds-amber"
                  : "text-ds-text-muted hover:text-ds-text hover:bg-white/25"
              }`}
            >
              Photo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
