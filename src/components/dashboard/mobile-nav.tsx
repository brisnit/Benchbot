"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/audits", label: "Audits", icon: ClipboardList, exact: false },
  { href: "/dashboard/audits/new", label: "New", icon: Plus, exact: false, primary: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 flex items-center justify-around border-t border-border bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        if (item.primary) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-white shadow-md"
              aria-label={item.label}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 text-[11px]",
              active ? "text-brand" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
