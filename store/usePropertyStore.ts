import { create } from "zustand";
import type { ScoredProperty } from "./useScoutStore";

interface PropertyState {
  selectedProperty: ScoredProperty | null;
  drawerOpen: boolean;

  selectProperty: (property: ScoredProperty | null) => void;
  openDrawer: (property: ScoredProperty) => void;
  closeDrawer: () => void;
}

export const usePropertyStore = create<PropertyState>((set) => ({
  selectedProperty: null,
  drawerOpen: false,

  selectProperty: (property) => set({ selectedProperty: property }),
  openDrawer: (property) =>
    set({ selectedProperty: property, drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
}));
