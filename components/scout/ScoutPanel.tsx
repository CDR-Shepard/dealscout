"use client";

import { useState, useCallback } from "react";
import { Search, Pencil, Rocket, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useScoutStore } from "@/store/useScoutStore";
import { useMapStore } from "@/store/useMapStore";
import { ActivityFeed } from "./ActivityFeed";
import { ProgressBar } from "./ProgressBar";
import { ScoutSummary } from "./ScoutSummary";

export function ScoutPanel() {
  const [searchInput, setSearchInput] = useState("");
  const [homeLimit, setHomeLimit] = useState(0);
  const { isRunning, log, properties, totalScanned, totalFlagged, duration, reset } =
    useScoutStore();
  const { drawnPolygon, setIsDrawing, isDrawing, setDrawnPolygon } = useMapStore();
  const scoutDone = !isRunning && properties.length > 0;

  const startScout = useCallback(async () => {
    const location = searchInput.trim();
    if (!location && !drawnPolygon) return;

    reset();
    useScoutStore.getState().setRunning(true);
    useScoutStore.getState().setLocation(location);

    if (location && !drawnPolygon) {
      try {
        const geoRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`
        );
        const geoData = await geoRes.json();
        if (geoData.features?.[0]) {
          const [lng, lat] = geoData.features[0].center;
          useMapStore.getState().flyTo([lng, lat], 12);
        }
      } catch {
        // geocoding failed, continue anyway
      }
    }

    useScoutStore
      .getState()
      .addLog({ type: "info", message: `Scanning ${location || "drawn area"}...` });

    try {
      const body: Record<string, unknown> = {};
      if (location) body.location = location;
      if (drawnPolygon) body.bounds = drawnPolygon;
      if (homeLimit > 0) body.limit = homeLimit;

      const response = await fetch("/api/scout/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            handleScoutEvent(parsed);
          } catch {
            // skip malformed event
          }
        }
      }
    } catch (err) {
      useScoutStore
        .getState()
        .addLog({ type: "error", message: `Scout failed: ${err}` });
      useScoutStore.getState().setRunning(false);
    }
  }, [searchInput, drawnPolygon, homeLimit, reset]);

  return (
    <div className="w-[360px] flex flex-col bg-ds-surface border-l border-ds-border overflow-hidden shadow-sm">
      {/* Search / Controls */}
      <div className="p-3 space-y-3 border-b border-ds-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ds-text-muted" />
          <Input
            placeholder="Enter zip code, city, or address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startScout()}
            className="pl-8 h-9 text-xs bg-ds-bg border-ds-border text-ds-text placeholder:text-ds-text-muted"
            disabled={isRunning}
          />
        </div>

        {/* Home limit selector */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-ds-text-secondary whitespace-nowrap">
            Homes to scan
          </label>
          <Input
            type="number"
            min={0}
            step={10}
            value={homeLimit}
            onChange={(e) => setHomeLimit(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-7 w-20 text-xs text-center bg-ds-bg border-ds-border text-ds-text font-mono"
            disabled={isRunning}
          />
          <span className="text-[10px] text-ds-text-muted">
            {homeLimit === 0 ? "all eligible" : `max ${homeLimit}`}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`flex-1 text-xs h-8 border-ds-border ${
              isDrawing
                ? "bg-ds-amber/10 text-ds-amber border-ds-amber/30"
                : "text-ds-text-secondary hover:text-ds-text"
            }`}
            onClick={() => {
              if (isDrawing) {
                setIsDrawing(false);
              } else if (drawnPolygon) {
                setDrawnPolygon(null);
              } else {
                setIsDrawing(true);
              }
            }}
            disabled={isRunning}
          >
            {drawnPolygon ? (
              <>
                <X className="w-3 h-3 mr-1" /> Clear Area
              </>
            ) : (
              <>
                <Pencil className="w-3 h-3 mr-1" />{" "}
                {isDrawing ? "Drawing..." : "Draw Area"}
              </>
            )}
          </Button>
        </div>

        <Button
          className="w-full h-10 text-sm font-semibold bg-ds-amber hover:bg-ds-amber/90 text-white"
          onClick={startScout}
          disabled={isRunning || (!searchInput.trim() && !drawnPolygon)}
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Scouting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Start Scout
            </span>
          )}
        </Button>
      </div>

      {/* Progress */}
      {isRunning && <ProgressBar />}

      {/* Scout Summary */}
      {scoutDone && (
        <ScoutSummary
          totalScanned={totalScanned}
          totalFlagged={totalFlagged}
          hotDeals={useScoutStore.getState().hotDeals.length}
          duration={duration ?? 0}
        />
      )}

      {/* Activity Feed */}
      <ActivityFeed entries={log} />
    </div>
  );
}

function handleScoutEvent(event: { type: string; data: Record<string, unknown> }) {
  const store = useScoutStore.getState();

  switch (event.type) {
    case "fetching":
      store.addLog({
        type: "info",
        message: event.data.message as string,
      });
      break;

    case "properties_found": {
      store.addLog({
        type: "success",
        message: `Found ${event.data.total} properties in target area`,
      });
      const breakdown: string[] = [];
      if (event.data.forSale) breakdown.push(`${event.data.forSale} listed`);
      if (event.data.foreclosures) breakdown.push(`${event.data.foreclosures} foreclosures`);
      if (event.data.pending) breakdown.push(`${event.data.pending} pending`);
      if (event.data.offMarket) breakdown.push(`${event.data.offMarket} off-market`);
      if (event.data.staleSold) breakdown.push(`${event.data.staleSold} stale owners`);
      if (breakdown.length > 0) {
        store.addLog({
          type: "info",
          message: `Breakdown: ${breakdown.join(", ")}`,
        });
      }
      if (event.data.offMarket) {
        store.addLog({
          type: "warning",
          message: `D4D mode: ${event.data.offMarket} off-market properties found`,
        });
      }
      break;
    }

    case "pre_filtering":
      store.addLog({
        type: "info",
        message: `Pre-filtered: ${event.data.passed} candidates, ${event.data.filtered} removed`,
      });
      break;

    case "aerial_scan":
      store.addLog({
        type: "info",
        message: event.data.message as string,
      });
      break;

    case "aerial_scan_complete":
      store.addLog({
        type: "success",
        message: `Aerial scan complete: ${event.data.analyzed} inspected, ${event.data.distressedCount} show deferred maintenance`,
      });
      break;

    case "scoring_batch":
      store.setProgress(
        event.data.batchNumber as number,
        event.data.totalBatches as number
      );
      store.addLog({
        type: "info",
        message: `AI scoring batch ${event.data.batchNumber}/${event.data.totalBatches}...`,
      });
      break;

    case "property_scored": {
      const prop = event.data.property as unknown as import("@/store/useScoutStore").ScoredProperty;
      store.addProperty(prop);
      if (prop.distressScore >= 60) {
        const label =
          prop.distressScore >= 80 ? "HOT" : prop.distressScore >= 60 ? "STRONG" : "";
        store.addLog({
          type: prop.distressScore >= 80 ? "hot_deal" : "success",
          message: `${label} ${prop.distressScore} - ${prop.address}`,
        });
      }
      break;
    }

    case "hot_deal": {
      const hotProp = event.data.property as unknown as import("@/store/useScoutStore").ScoredProperty;
      store.addHotDeal(hotProp);
      break;
    }

    case "complete":
      store.setResults({
        totalScanned: event.data.totalScanned as number,
        totalFlagged: event.data.totalFlagged as number,
        hotDeals: event.data.hotDeals as number,
        duration: event.data.duration as number,
        scoutSessionId: event.data.scoutSessionId as string,
      });
      store.addLog({
        type: "success",
        message: `Scout complete! ${event.data.totalFlagged} flagged, ${event.data.hotDeals} hot deals`,
      });
      break;

    case "error":
      store.addLog({
        type: "error",
        message: event.data.message as string,
      });
      store.setRunning(false);
      break;
  }
}
