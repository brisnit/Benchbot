"use client";

import * as React from "react";
import { Monitor, Smartphone, ImageOff, Download, Copy, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ShotImage } from "@/components/audit/shot-image";
import { useToast } from "@/components/ui/toast";
import { cn, hostFromUrl } from "@/lib/utils";
import type { Screenshot, PageType, DeviceType } from "@/lib/types";

function extFromType(type: string): string {
  if (type.includes("svg")) return "svg";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  return "png";
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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
            <ScreenshotCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScreenshotCard({ s }: { s: Screenshot }) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<"save" | "copy" | null>(null);

  const baseName = `${slug(s.company_name || hostFromUrl(s.url))}-${s.page_type}-${s.device_type}`;

  async function save() {
    setBusy("save");
    try {
      const res = await fetch(s.storage_path);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}.${extFromType(blob.type)}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Screenshot saved", variant: "success" });
    } catch {
      toast({ title: "Couldn't save", description: "Try opening the image and saving it.", variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    setBusy("copy");
    try {
      const res = await fetch(s.storage_path);
      const blob = await res.blob();
      const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (!navigator.clipboard || !ClipboardItemCtor || blob.type.includes("svg")) {
        throw new Error("unsupported");
      }
      await navigator.clipboard.write([new ClipboardItemCtor({ [blob.type]: blob })]);
      toast({ title: "Screenshot copied to clipboard", variant: "success" });
    } catch {
      // Fallback: copy a link to the image instead of the bytes.
      try {
        await navigator.clipboard.writeText(new URL(s.storage_path, window.location.origin).toString());
        toast({ title: "Image link copied", description: "Your browser blocks image copy; copied the link instead." });
      } catch {
        toast({ title: "Couldn't copy", variant: "error" });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <figure className="group overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <ShotImage
          src={s.storage_path}
          alt={`${s.company_name} ${s.page_type} (${s.device_type})`}
          className="h-full w-full object-cover object-top"
        />
        {/* hover action overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end gap-1.5 bg-gradient-to-b from-ink/40 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <CardAction label="Open full image" onClick={() => window.open(s.storage_path, "_blank")}>
            <Maximize2 className="h-4 w-4" />
          </CardAction>
          <CardAction label="Copy screenshot" onClick={copy} loading={busy === "copy"}>
            <Copy className="h-4 w-4" />
          </CardAction>
          <CardAction label="Save screenshot" onClick={save} loading={busy === "save"}>
            <Download className="h-4 w-4" />
          </CardAction>
        </div>
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
  );
}

function CardAction({
  label,
  onClick,
  loading,
  children,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={loading}
      className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-md bg-white/95 text-ink shadow-sm transition-colors hover:bg-white disabled:opacity-60"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      ) : (
        children
      )}
    </button>
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
