"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";

interface ScoutSession {
  id: string;
  location: string;
  totalScanned: number;
  totalFlagged: number;
  hotDeals: number;
  duration: number | null;
  status: string;
  createdAt: string;
  _count: { properties: number };
}

export default function ScoutsPage() {
  const [sessions, setSessions] = useState<ScoutSession[]>([]);

  useEffect(() => {
    fetch("/api/scout/sessions")
      .then((r) => r.json())
      .then((d) => d.success && setSessions(d.sessions))
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ds-text font-[var(--font-heading)]">
          Scout History
        </h1>
        <p className="text-xs text-ds-text-muted mt-0.5">
          Review past scouting sessions and their results
        </p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-[10px] text-ds-text-muted">
                Location
              </TableHead>
              <TableHead className="text-[10px] text-ds-text-muted">
                Date
              </TableHead>
              <TableHead className="text-[10px] text-ds-text-muted text-right">
                Scanned
              </TableHead>
              <TableHead className="text-[10px] text-ds-text-muted text-right">
                Flagged
              </TableHead>
              <TableHead className="text-[10px] text-ds-text-muted text-right">
                Hot Deals
              </TableHead>
              <TableHead className="text-[10px] text-ds-text-muted text-right">
                Duration
              </TableHead>
              <TableHead className="text-[10px] text-ds-text-muted">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell
                  colSpan={7}
                  className="text-center text-xs text-ds-text-muted py-8"
                >
                  No scouts yet. Go to the map to start your first scout!
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((s) => (
                <TableRow
                  key={s.id}
                  className="border-white/10 hover:bg-white/20 cursor-pointer transition-colors"
                >
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-ds-text-muted" />
                      <span className="text-xs text-ds-text">{s.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-ds-text-secondary py-2">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-ds-text py-2">
                    {s.totalScanned}
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-ds-orange/30 text-ds-orange font-mono"
                    >
                      {s.totalFlagged}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-2">
                    {s.hotDeals > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-red-50 text-ds-red border-red-200 font-mono"
                      >
                        {s.hotDeals}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <div className="flex items-center justify-end gap-1 text-xs text-ds-text-muted">
                      <Clock className="w-3 h-3" />
                      {s.duration ? `${s.duration}s` : "-"}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        s.status === "completed"
                          ? "border-ds-green/30 text-ds-green"
                          : s.status === "running"
                            ? "border-ds-blue/30 text-ds-blue"
                            : "border-ds-red/30 text-ds-red"
                      }`}
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
