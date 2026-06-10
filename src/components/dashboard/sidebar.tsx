"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Plus,
  Settings,
  Users,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/audits", label: "Audits", icon: ClipboardList, exact: false },
  { href: "/dashboard/workspace", label: "Team Setup", icon: Users, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard">
          <Logo variant="light" />
        </Link>
      </div>

      <div className="px-3 pt-2">
        <Link
          href="/dashboard/audits/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-gradient px-3 py-2.5 text-sm font-display font-medium text-white shadow-sm transition-opacity hover:opacity-95"
        >
          <Plus className="h-4 w-4" />
          New audit
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white",
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px]", active ? "text-brand" : "text-sidebar-muted")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4">
        <div className="flex items-center gap-2 text-violet">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Pro tip</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-sidebar-muted">
          Add best-in-class inspiration sites to your competitor set for sharper recommendations.
        </p>
      </div>
    </aside>
  );
}
