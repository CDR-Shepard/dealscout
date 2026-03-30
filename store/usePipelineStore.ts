import { create } from "zustand";

export const PIPELINE_STAGES = [
  "scouted",
  "contacting",
  "negotiating",
  "under_contract",
  "closed",
  "dead",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface PipelineProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  listPrice: number | null;
  distressScore: number | null;
  investmentType: string | null;
  maxAllowableOffer: number | null;
  primaryPhoto: string | null;
  pipelineStage: PipelineStage;
  createdAt: string;
  updatedAt: string;
}

interface PipelineState {
  properties: PipelineProperty[];
  loading: boolean;

  setProperties: (properties: PipelineProperty[]) => void;
  moveProperty: (propertyId: string, stage: PipelineStage) => void;
  setLoading: (loading: boolean) => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  properties: [],
  loading: false,

  setProperties: (properties) => set({ properties }),
  moveProperty: (propertyId, stage) =>
    set((state) => ({
      properties: state.properties.map((p) =>
        p.id === propertyId ? { ...p, pipelineStage: stage } : p
      ),
    })),
  setLoading: (loading) => set({ loading }),
}));
