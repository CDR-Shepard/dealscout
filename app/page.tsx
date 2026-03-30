"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Flame,
  DollarSign,
  History,
  Rocket,
  MapPin,
  TrendingUp,
} from "lucide-react";

interface DashboardData {
  totalLeads: number;
  hotDeals: number;
  pipelineValue: number;
  recentScouts: {
    id: string;
    location: string;
    totalScanned: number;
    totalFlagged: number;
    hotDeals: number;
    status: string;
    createdAt: string;
  }[];
  topProperties: {
    id: string;
    address: string;
    city: string;
    state: string;
    distressScore: number | null;
    listPrice: number | null;
    maxAllowableOffer: number | null;
    investmentType: string | null;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => d.success && setData(d))
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ds-text font-[var(--font-heading)]">
            Dashboard
          </h1>
          <p className="text-xs text-ds-text-muted mt-0.5">
            Property scouting command center
          </p>
        </div>
        <Link href="/map">
          <Button className="bg-ds-amber hover:bg-ds-amber/90 text-white text-sm">
            <Rocket className="w-4 h-4 mr-2" />
            New Scout
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5 text-ds-blue" />}
          label="Total Leads"
          value={data?.totalLeads ?? 0}
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-ds-red" />}
          label="Hot Deals"
          value={data?.hotDeals ?? 0}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-ds-green" />}
          label="Pipeline Value"
          value={`$${((data?.pipelineValue ?? 0) / 1000).toFixed(0)}k`}
          isMoney
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Opportunities */}
        <Card className="bg-ds-surface border-ds-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-ds-text flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-ds-amber" />
              Top Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.topProperties ?? []).length === 0 ? (
              <p className="text-xs text-ds-text-muted py-4 text-center">
                No properties yet. Start a scout!
              </p>
            ) : (
              data?.topProperties.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-md bg-ds-bg border border-ds-border"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono shrink-0 ${
                        (p.distressScore ?? 0) >= 80
                          ? "bg-red-100 text-red-800 border-red-200"
                          : (p.distressScore ?? 0) >= 60
                            ? "bg-orange-100 text-orange-800 border-orange-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      {p.distressScore ?? "-"}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-xs text-ds-text truncate">
                        {p.address}
                      </p>
                      <p className="text-[10px] text-ds-text-muted">
                        {p.city}, {p.state}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {p.listPrice && (
                      <p className="font-mono text-[10px] text-ds-text-secondary">
                        ${(p.listPrice / 1000).toFixed(0)}k
                      </p>
                    )}
                    {p.maxAllowableOffer && (
                      <p className="font-mono text-[10px] text-ds-amber font-medium">
                        MAO ${(p.maxAllowableOffer / 1000).toFixed(0)}k
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Scouts */}
        <Card className="bg-ds-surface border-ds-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-ds-text flex items-center gap-2">
              <History className="w-4 h-4 text-ds-blue" />
              Recent Scouts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentScouts ?? []).length === 0 ? (
              <p className="text-xs text-ds-text-muted py-4 text-center">
                No scouts yet. Go to the map to start!
              </p>
            ) : (
              data?.recentScouts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-md bg-ds-bg border border-ds-border"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-ds-text-muted shrink-0" />
                    <div>
                      <p className="text-xs text-ds-text">{s.location}</p>
                      <p className="text-[10px] text-ds-text-muted">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-ds-text-secondary">
                      {s.totalScanned} scanned
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-ds-border text-ds-orange"
                    >
                      {s.totalFlagged} flagged
                    </Badge>
                    {s.hotDeals > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-red-50 text-ds-red border-red-200"
                      >
                        {s.hotDeals} hot
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  isMoney = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  isMoney?: boolean;
}) {
  return (
    <Card className="bg-ds-surface border-ds-border shadow-sm">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-lg bg-ds-elevated flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-[10px] text-ds-text-muted uppercase tracking-wider">
            {label}
          </p>
          <p
            className={`text-xl font-bold ${isMoney ? "text-ds-green" : "text-ds-text"} font-mono`}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
