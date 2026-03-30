"use client";

import { useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import {
  usePipelineStore,
  PIPELINE_STAGES,
  type PipelineStage,
  type PipelineProperty,
} from "@/store/usePipelineStore";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";

const STAGE_LABELS: Record<PipelineStage, string> = {
  scouted: "Scouted",
  contacting: "Contacting",
  negotiating: "Negotiating",
  under_contract: "Under Contract",
  closed: "Closed",
  dead: "Dead",
};

const STAGE_COLORS: Record<PipelineStage, string> = {
  scouted: "text-ds-blue",
  contacting: "text-ds-orange",
  negotiating: "text-ds-amber",
  under_contract: "text-ds-green",
  closed: "text-emerald-600",
  dead: "text-ds-text-muted",
};

export function KanbanBoard() {
  const { properties, setProperties, moveProperty, setLoading } =
    usePipelineStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/properties");
        const data = await res.json();
        if (data.success) {
          setProperties(data.properties);
        }
      } catch {
        // handle error
      }
      setLoading(false);
    };
    fetchProperties();
  }, [setProperties, setLoading]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const propertyId = active.id as string;
      const newStage = over.id as PipelineStage;

      const property = properties.find((p) => p.id === propertyId);
      if (!property || property.pipelineStage === newStage) return;

      // Optimistic update
      moveProperty(propertyId, newStage);

      // Persist
      try {
        await fetch(`/api/properties/${propertyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipelineStage: newStage }),
        });
      } catch {
        // revert on error
        moveProperty(propertyId, property.pipelineStage);
      }
    },
    [properties, moveProperty]
  );

  const activeProperty = activeId
    ? properties.find((p) => p.id === activeId) ?? null
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full overflow-x-auto p-4">
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            label={STAGE_LABELS[stage]}
            color={STAGE_COLORS[stage]}
            properties={properties.filter((p) => p.pipelineStage === stage)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProperty ? <KanbanCard property={activeProperty} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
