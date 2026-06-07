"use client";

import * as React from "react";
import { Monitor, Smartphone, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Screenshot, PageType, DeviceType } from "@/lib/types";

const PAGE_FILTERS: { value: PageType | "all"; label: string }[] = [
  { value: "all", label: "All pages" },
  { value: "homepage", label: "Homepage" },
  { value: "navigation", label: "Navigation" },
  { value: "product", label: "Product pages" },
  { value: "pricing", label: "Pricing" },
  { value: "forms", label: "Forms" },
  { value: "search", label: "Search" },
  { value: "contact", label: "Contact" },
  { value: "footer", label: "Footer" },
];

const DEVICE_FILTERS: { value: DeviceType | "all"; label: string }[] = [
  { value: "all", label: "All devices" },
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
];

export function ScreenshotsLibrary({ screenshots }: { screenshots: Screenshot[] }) {
  const [page, setPage] = React.useState<PageType | "all">("all");
  const [device, setDevice] = React.useState<DeviceType | "all">("all");

  const filtered = screenshots.filter(
    (s) => (page === "all" || s.page_type === page) && (device === "all" || s.device_type === device),
  );

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {PAGE_FILTERS.map((f) => (
            <FilterChip key={f.value} active={page === f.value} onClick={() => setPage(f.value)}>
              {f.label}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEVICE_FILTERS.map((f) => (
            <FilterChip key={f.value} active={device === f.value} onClick={() => setDevice(f.value)}>
              {f.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No screenshots match these filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <figure key={s.id} className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
              <div className="aspect-[4/3] overflow-hidden bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.storage_path}
                  alt={`${s.company_name} ${s.page_type} (${s.device_type})`}
                  className="h-full w-full object-cover object-top"
                  loading="lazy"
                />
              </div>
              <figcaption className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{s.company_name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{s.page_type}</p>
                </div>
                <Badge variant="secondary" className="gap-1 capitalize">
                  {s.device_type === "mobile" ? (
                    <Smartphone className="h-3 w-3" />
                  ) : (
                    <Monitor className="h-3 w-3" />
                  )}
                  {s.device_type}
                </Badge>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-brand bg-brand text-white"
          : "border-border bg-white text-slate-600 hover:border-brand/40 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
