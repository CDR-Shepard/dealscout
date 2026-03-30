import { create } from "zustand";

export interface ScoredProperty {
  id: string;
  propertyId: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  listPrice: number | null;
  sqft: number | null;
  beds: number | null;
  baths: number | null;
  yearBuilt: number | null;
  daysOnMls: number | null;
  propertyType: string | null;
  primaryPhoto: string | null;
  description: string | null;
  distressScore: number;
  distressSignals: string[];
  investmentType: string;
  estimatedArv: number | null;
  repairLevel: string | null;
  repairCostLow: number | null;
  repairCostHigh: number | null;
  maxAllowableOffer: number | null;
  wholesaleFeeEst: number | null;
  flipProfitEst: number | null;
  aiReasoning: string | null;
  aiConfidence: number | null;
  recommendedAction: string | null;
  source: string | null;
  yearsSinceSale: number | null;
  satelliteUrl: string | null;
  streetViewUrl: string | null;
  visualAnalysis: {
    score: number;
    signals: string[];
    condition: string;
    notes: string;
  } | null;
}

export interface ScoutLogEntry {
  timestamp: number;
  type: "info" | "success" | "warning" | "error" | "hot_deal";
  message: string;
}

interface ScoutState {
  isRunning: boolean;
  location: string;
  progress: number;
  totalBatches: number;
  currentBatch: number;
  properties: ScoredProperty[];
  hotDeals: ScoredProperty[];
  log: ScoutLogEntry[];
  totalScanned: number;
  totalFlagged: number;
  scoutSessionId: string | null;
  duration: number | null;

  setRunning: (running: boolean) => void;
  setLocation: (location: string) => void;
  setProgress: (current: number, total: number) => void;
  addProperty: (property: ScoredProperty) => void;
  addHotDeal: (property: ScoredProperty) => void;
  addLog: (entry: Omit<ScoutLogEntry, "timestamp">) => void;
  setResults: (results: {
    totalScanned: number;
    totalFlagged: number;
    hotDeals: number;
    duration: number;
    scoutSessionId: string;
  }) => void;
  reset: () => void;
}

const initialState = {
  isRunning: false,
  location: "",
  progress: 0,
  totalBatches: 0,
  currentBatch: 0,
  properties: [] as ScoredProperty[],
  hotDeals: [] as ScoredProperty[],
  log: [] as ScoutLogEntry[],
  totalScanned: 0,
  totalFlagged: 0,
  scoutSessionId: null as string | null,
  duration: null as number | null,
};

export const useScoutStore = create<ScoutState>((set) => ({
  ...initialState,

  setRunning: (running) => set({ isRunning: running }),
  setLocation: (location) => set({ location }),
  setProgress: (current, total) =>
    set({
      currentBatch: current,
      totalBatches: total,
      progress: total > 0 ? (current / total) * 100 : 0,
    }),
  addProperty: (property) =>
    set((state) => ({ properties: [...state.properties, property] })),
  addHotDeal: (property) =>
    set((state) => ({ hotDeals: [...state.hotDeals, property] })),
  addLog: (entry) =>
    set((state) => ({
      log: [...state.log, { ...entry, timestamp: Date.now() }],
    })),
  setResults: (results) =>
    set({
      isRunning: false,
      totalScanned: results.totalScanned,
      totalFlagged: results.totalFlagged,
      duration: results.duration,
      scoutSessionId: results.scoutSessionId,
    }),
  reset: () => set(initialState),
}));
