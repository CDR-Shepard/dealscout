import { create } from "zustand";

interface MapState {
  center: [number, number];
  zoom: number;
  drawnPolygon: [number, number][] | null;
  isDrawing: boolean;
  showHeatmap: boolean;
  showAllMarkers: boolean;

  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setDrawnPolygon: (polygon: [number, number][] | null) => void;
  setIsDrawing: (drawing: boolean) => void;
  toggleHeatmap: () => void;
  toggleShowAll: () => void;
  flyTo: (center: [number, number], zoom?: number) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: [-98.5795, 39.8283], // Center of US
  zoom: 4,
  drawnPolygon: null,
  isDrawing: false,
  showHeatmap: false,
  showAllMarkers: false,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setDrawnPolygon: (polygon) => set({ drawnPolygon: polygon }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
  toggleShowAll: () => set((s) => ({ showAllMarkers: !s.showAllMarkers })),
  flyTo: (center, zoom = 13) => set({ center, zoom }),
}));
