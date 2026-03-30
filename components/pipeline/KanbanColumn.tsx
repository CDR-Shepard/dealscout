"use client";

import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import type { PipelineStage, PipelineProperty } from "@/store/usePipelineStore";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  stage: PipelineStage;
  label: string;
  color: string;
  properties: PipelineProperty[];
}

export function KanbanColumn({
  stage,
  label,
  color,
  properties,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[260px] min-w-[260px] rounded-2xl glass transition-all ${
        isOver ? "border-ds-amber/40 bg-ds-amber/5" : ""
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/15">
        <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>
          {label}
        </span>
        <Badge
          variant="outline"
          className="text-[10px] border-ds-border text-ds-text-muted font-mono"
        >
          {properties.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {properties.map((property) => (
          <KanbanCard key={property.id} property={property} />
        ))}
        {properties.length === 0 && (
          <div className="flex items-center justify-center h-20 text-[10px] text-ds-text-muted">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
