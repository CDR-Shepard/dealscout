"use client";

import { useRef, useCallback, useEffect } from "react";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "@/store/useMapStore";
import { useScoutStore, type ScoredProperty } from "@/store/useScoutStore";
import { usePropertyStore } from "@/store/usePropertyStore";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

function scoreColor(score: number): string {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#6b7280";
}

function scoreSize(score: number): number {
  if (score >= 80) return 16;
  if (score >= 60) return 13;
  if (score >= 40) return 11;
  return 8;
}

function PropertyMarkerDot({
  property,
  onClick,
}: {
  property: ScoredProperty;
  onClick: () => void;
}) {
  const color = scoreColor(property.distressScore);
  const size = scoreSize(property.distressScore);
  const isHot = property.distressScore >= 80;

  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer group"
      style={{ width: size * 2.5, height: size * 2.5 }}
    >
      {isHot && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-40"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className="relative rounded-full border-2 border-white flex items-center justify-center font-mono text-[9px] font-bold text-white shadow-lg"
        style={{
          width: size * 2,
          height: size * 2,
          backgroundColor: color,
          boxShadow: isHot ? `0 0 12px ${color}66` : undefined,
        }}
      >
        {property.distressScore}
      </span>
    </button>
  );
}

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const { center, zoom, drawnPolygon, showHeatmap } = useMapStore();
  const { properties, isRunning } = useScoutStore();
  const { openDrawer } = usePropertyStore();

  // Fly to new center when it changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: { lng: center[0], lat: center[1] },
        zoom,
        duration: 2000,
      });
    }
  }, [center, zoom]);

  const handleMarkerClick = useCallback(
    (property: ScoredProperty) => {
      openDrawer(property);
    },
    [openDrawer]
  );

  // Build heatmap GeoJSON
  const heatmapData = {
    type: "FeatureCollection" as const,
    features: properties
      .filter((p) => p.latitude && p.longitude)
      .map((p) => ({
        type: "Feature" as const,
        properties: { weight: p.distressScore / 100 },
        geometry: {
          type: "Point" as const,
          coordinates: [p.longitude!, p.latitude!],
        },
      })),
  };

  // Drawn polygon GeoJSON
  const polygonData = drawnPolygon
    ? {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "Polygon" as const,
              coordinates: [drawnPolygon],
            },
          },
        ],
      }
    : null;

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ds-elevated">
        <div className="text-center space-y-2">
          <p className="text-ds-text-secondary text-sm">
            Mapbox token not configured
          </p>
          <p className="text-ds-text-muted text-xs">
            Set NEXT_PUBLIC_MAPBOX_TOKEN in .env
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="bottom-right" />

        {/* Heatmap layer */}
        {showHeatmap && heatmapData.features.length > 0 && (
          <Source type="geojson" data={heatmapData}>
            <Layer
              id="heatmap"
              type="heatmap"
              paint={{
                "heatmap-weight": ["get", "weight"],
                "heatmap-intensity": 1,
                "heatmap-radius": 30,
                "heatmap-opacity": 0.6,
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(0,0,0,0)",
                  0.2, "#15803d",
                  0.4, "#ca8a04",
                  0.6, "#ea580c",
                  0.8, "#dc2626",
                  1, "#b91c1c",
                ],
              }}
            />
          </Source>
        )}

        {/* Drawn polygon boundary */}
        {polygonData && (
          <Source type="geojson" data={polygonData}>
            <Layer
              id="polygon-fill"
              type="fill"
              paint={{
                "fill-color": "#b45309",
                "fill-opacity": 0.08,
              }}
            />
            <Layer
              id="polygon-border"
              type="line"
              paint={{
                "line-color": "#b45309",
                "line-width": 2,
                "line-dasharray": [3, 2],
              }}
            />
          </Source>
        )}

        {/* Property markers */}
        {properties
          .filter((p) => p.latitude && p.longitude)
          .map((property) => (
            <Marker
              key={property.id || property.propertyId}
              longitude={property.longitude!}
              latitude={property.latitude!}
              anchor="center"
            >
              <PropertyMarkerDot
                property={property}
                onClick={() => handleMarkerClick(property)}
              />
            </Marker>
          ))}
      </Map>

      {/* Scanning overlay */}
      {isRunning && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-ds-amber/[0.06] animate-scan-sweep" />
        </div>
      )}
    </div>
  );
}
