"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map,
  LayoutDashboard,
  Kanban,
  History,
  Crosshair,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Map", icon: Map },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/scouts", label: "Scouts", icon: History },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="glass-elevated flex items-center justify-between h-12 px-4 shrink-0 z-30 border-b border-white/20">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-7 h-7 rounded-lg bg-ds-amber/10 backdrop-blur-sm flex items-center justify-center">
          <Crosshair className="w-4 h-4 text-ds-amber" />
        </div>
        <span className="font-[var(--font-heading)] font-bold text-sm tracking-wide text-ds-text group-hover:text-ds-amber transition-colors">
          DEALSCOUT
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                active
                  ? "glass-subtle text-ds-amber"
                  : "text-ds-text-secondary hover:text-ds-text hover:bg-white/20"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="w-[140px]" />
    </nav>
  );
}
