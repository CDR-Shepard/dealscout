"use client";

import { KanbanBoard } from "@/components/pipeline/KanbanBoard";

export default function PipelinePage() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-ds-border bg-ds-surface shadow-sm">
        <h1 className="text-sm font-semibold text-ds-text font-[var(--font-heading)]">
          Deal Pipeline
        </h1>
        <p className="text-[10px] text-ds-text-muted mt-0.5">
          Drag properties between stages to track your deal flow
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>
    </div>
  );
}
