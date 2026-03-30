"use client";

import { MapView } from "@/components/map/MapView";
import { ScoutPanel } from "@/components/scout/ScoutPanel";
import { PropertyDetailDrawer } from "@/components/property/PropertyDetailDrawer";
import { ResultsTable } from "@/components/results/ResultsTable";

export default function MapPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        <MapView />
        <ScoutPanel />
      </div>
      <ResultsTable />
      <PropertyDetailDrawer />
    </div>
  );
}
