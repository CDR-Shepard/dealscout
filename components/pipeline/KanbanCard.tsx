"use client";

import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import type { PipelineProperty } from "@/store/usePipelineStore";

function scoreBadgeClass(score: number | null): string {
  if (!score) return "bg-stone-100 text-stone-500";
  if (score >= 80) return "bg-red-100 text-red-800";
  if (score >= 60) return "bg-orange-100 text-orange-800";
  if (score >= 40) return "bg-amber-100 text-amber-800";
  return "bg-stone-100 text-stone-500";
}

interface KanbanCardProps {
  property: PipelineProperty;
  isDragging?: boolean;
}

export function KanbanCard({ property, isDragging = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: property.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2.5 rounded-md border bg-ds-surface cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging
          ? "border-ds-amber/50 shadow-lg shadow-ds-amber/10 opacity-90"
          : "border-ds-border hover:border-ds-border-active hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ds-text truncate">
            {property.address}
          </p>
          <p className="text-[10px] text-ds-text-muted truncate">
            {property.city}, {property.state}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] font-mono shrink-0 ${scoreBadgeClass(property.distressScore)}`}
        >
          {property.distressScore ?? "-"}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        {property.listPrice && (
          <span className="font-mono text-[10px] text-ds-text-secondary">
            ${(property.listPrice / 1000).toFixed(0)}k
          </span>
        )}
        {property.maxAllowableOffer && (
          <span className="font-mono text-[10px] text-ds-amber font-medium">
            MAO ${(property.maxAllowableOffer / 1000).toFixed(0)}k
          </span>
        )}
        {property.investmentType && (
          <Badge
            variant="outline"
            className="text-[8px] border-ds-border text-ds-text-muted ml-auto"
          >
            {property.investmentType.replace("_", "&")}
          </Badge>
        )}
      </div>
    </div>
  );
}
