"use client";

import * as React from "react";
import {
  Search,
  Star,
  Plus,
  X,
  Loader2,
  Sparkles,
  Wand2,
  ExternalLink,
  Crown,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Users,
  Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { AppInfo } from "@/lib/apps/itunes";
import type { AppComparison } from "@/lib/apps/analyze";

const COUNTRIES = [
  ["us", "United States"], ["gb", "United Kingdom"], ["ca", "Canada"], ["au", "Australia"],
  ["de", "Germany"], ["fr", "France"], ["jp", "Japan"], ["br", "Brazil"], ["in", "India"],
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i <= Math.round(rating) ? "fill-warn text-warn" : "fill-slate-200 text-slate-200")} />
      ))}
    </span>
  );
}

export function AppCompare() {
  const { toast } = useToast();
  const [country, setCountry] = React.useState("us");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<AppInfo[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<AppInfo[]>([]);
  const [targetId, setTargetId] = React.useState<number | null>(null);
  const [comparing, setComparing] = React.useState(false);
  const [discovering, setDiscovering] = React.useState(false);
  const [data, setData] = React.useState<AppComparisonData | null>(null);

  // debounced search
  React.useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/apps/search?q=${encodeURIComponent(query)}&country=${country}`);
        const d = await res.json();
        setResults(d.results ?? []);
        setOpen(true);
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(id);
  }, [query, country]);

  function addApp(a: AppInfo) {
    if (selected.some((s) => s.id === a.id)) return;
    if (selected.length >= 6) { toast({ title: "Up to 6 apps", variant: "error" }); return; }
    setSelected((prev) => [...prev, a]);
    if (targetId === null) setTargetId(a.id);
    setQuery("");
    setResults([]);
    setOpen(false);
  }
  function removeApp(id: number) {
    setSelected((prev) => prev.filter((s) => s.id !== id));
    if (targetId === id) setTargetId((prev) => (selected.find((s) => s.id !== id)?.id ?? null) || null);
  }

  async function findCompetitors() {
    if (targetId == null) { toast({ title: "Add an app first", variant: "error" }); return; }
    setDiscovering(true);
    try {
      const res = await fetch("/api/apps/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetId, country }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const d: { apps: AppInfo[]; source: "ai" | "category" } = await res.json();
      let added = 0;
      setSelected((prev) => {
        const ids = new Set(prev.map((s) => s.id));
        const room = 6 - prev.length;
        const toAdd = d.apps.filter((a) => !ids.has(a.id)).slice(0, Math.max(0, room));
        added = toAdd.length;
        return [...prev, ...toAdd];
      });
      toast({
        title: added ? `Added ${added} competitor${added === 1 ? "" : "s"}` : "No new competitors found",
        description: d.source === "ai" ? "Suggested by AI from the App Store." : "Top apps in the same category.",
        variant: added ? "success" : "default",
      });
    } catch (e) {
      toast({ title: "Couldn't find competitors", description: (e as Error).message, variant: "error" });
    } finally {
      setDiscovering(false);
    }
  }

  async function compare() {
    if (selected.length < 2) { toast({ title: "Add at least 2 apps to compare", variant: "error" }); return; }
    setComparing(true);
    try {
      const res = await fetch("/api/apps/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected.map((s) => s.id), targetId, country }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setData(await res.json());
    } catch (e) {
      toast({ title: "Couldn't compare apps", description: (e as Error).message, variant: "error" });
    } finally {
      setComparing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Picker */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
              placeholder="Search the App Store — e.g. Notion, Headspace, Robinhood…"
              className="pl-9"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand" />}
            {open && results.length > 0 && (
              <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-border bg-white shadow-lg scrollbar-thin">
                {results.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => addApp(a)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.icon} alt="" className="h-9 w-9 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.developer} · {a.category}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-warn text-warn" /> {a.rating || "—"}
                    </span>
                    <Plus className="h-4 w-4 text-brand" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-sm"
          >
            {COUNTRIES.map(([c, label]) => <option key={c} value={c}>{label}</option>)}
          </select>
          <Button variant="secondary" onClick={findCompetitors} disabled={discovering || targetId == null}>
            {discovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Find competitors
          </Button>
          <Button variant="gradient" onClick={compare} disabled={comparing || selected.length < 2}>
            {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Compare apps
          </Button>
        </div>

        {/* selected chips */}
        {selected.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selected.map((a) => (
              <div key={a.id} className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-1.5", targetId === a.id ? "border-brand bg-brand-50/50" : "border-border bg-white")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.icon} alt="" className="h-6 w-6 rounded-md" />
                <span className="text-sm font-medium">{a.name}</span>
                {targetId === a.id ? (
                  <Badge variant="brand">Target</Badge>
                ) : (
                  <button onClick={() => setTargetId(a.id)} className="text-[11px] font-medium text-brand hover:underline">set target</button>
                )}
                <button onClick={() => removeApp(a.id)} className="text-muted-foreground hover:text-critical"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Add your app, then hit <strong>Find competitors</strong> to let BenchBot suggest rivals — or add 2–6 apps yourself. The first becomes the “target”; click <em>set target</em> to change it.</p>
        )}
      </Card>

      {data && <AppComparisonView data={data} />}
    </div>
  );
}

export interface AppComparisonData {
  id: string;
  target: AppInfo;
  competitors: AppInfo[];
  apps: AppInfo[];
  comparison: AppComparison;
}

export function AppComparisonView({ data }: { data: AppComparisonData }) {
  const { apps, target, comparison } = data;
  const { toast } = useToast();
  const [exporting, setExporting] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const maxReviews = Math.max(...apps.map((a) => a.ratingCount), 1);
  const insightFor = (id: number) => comparison.insights.find((i) => i.appId === id);
  const topRated = [...apps].sort((a, b) => b.rating - a.rating)[0];

  async function exportPptx() {
    setExporting(true);
    try {
      const res = await fetch(`/api/apps/${data.id}/pptx`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${target.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-app-benchmark.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "PowerPoint downloaded", variant: "success" });
    } catch {
      toast({ title: "Couldn't export PowerPoint", variant: "error" });
    } finally {
      setExporting(false);
    }
  }

  async function addToWorkspace() {
    setAdding(true);
    try {
      const res = await fetch("/api/board/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.id, kind: "app", replace: false }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Added to Workspace", description: "Open Workspace to collaborate on it.", variant: "success" });
    } catch {
      toast({ title: "Couldn't add to Workspace", variant: "error" });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold tracking-tight">{target.name} — app benchmark</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={addToWorkspace} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Add to Workspace
          </Button>
          <Button variant="secondary" size="sm" onClick={exportPptx} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
            Export PowerPoint
          </Button>
        </div>
      </div>
      {/* App cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((a) => (
          <Card key={a.id} className={cn("p-4", a.id === target.id && "border-brand/40 ring-1 ring-brand/15")}>
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.icon} alt="" className="h-14 w-14 rounded-xl shadow-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-display font-semibold text-ink">{a.name}</p>
                  {a.id === target.id && <Badge variant="brand">Target</Badge>}
                  {a.id === topRated.id && a.id !== target.id && <Trophy className="h-3.5 w-3.5 text-warn" />}
                </div>
                <p className="truncate text-xs text-muted-foreground">{a.developer}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Stars rating={a.rating} />
                  <span className="text-xs font-medium text-ink">{a.rating || "—"}</span>
                  <span className="text-xs text-muted-foreground">({a.ratingCount.toLocaleString()})</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="secondary">{a.category}</Badge>
              <Badge variant={a.free ? "good" : "secondary"}>{a.price}</Badge>
              {a.sizeMB > 0 && <Badge variant="outline">{a.sizeMB} MB</Badge>}
              {a.version && <Badge variant="outline">v{a.version}</Badge>}
            </div>
            <a href={a.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              View on App Store <ExternalLink className="h-3 w-3" />
            </a>
          </Card>
        ))}
      </div>

      {/* Ratings comparison */}
      <Card className="p-5">
        <h3 className="mb-4 font-display font-semibold">Ratings & reviews</h3>
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="grid grid-cols-[10rem_1fr_auto] items-center gap-3">
              <span className="flex items-center gap-1.5 truncate text-sm">
                {a.id === target.id && <Crown className="h-3.5 w-3.5 shrink-0 text-brand" />}
                <span className="truncate font-medium">{a.name}</span>
              </span>
              <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.max(2, (a.ratingCount / maxReviews) * 100)}%` }} />
              </div>
              <span className="flex w-32 items-center justify-end gap-2 text-xs">
                <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-warn text-warn" />{a.rating || "—"}</span>
                <span className="text-muted-foreground">{a.ratingCount.toLocaleString()} reviews</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* AI insights */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display font-semibold">Competitive insights</h3>
          <Badge variant={comparison.aiEstimated ? "warn" : "violet"} className="gap-1">
            <Sparkles className="h-3 w-3" /> {comparison.aiEstimated ? "AI-estimated" : "AI analysis"}
          </Badge>
        </div>
        <p className="text-sm text-slate-700">{comparison.summary}</p>
        {comparison.recommendations.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-good">Recommendations for {target.name}</p>
            <ul className="space-y-1.5">
              {comparison.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" /> {r}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {apps.map((a) => {
            const ins = insightFor(a.id);
            if (!ins) return null;
            return (
              <div key={a.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.icon} alt="" className="h-7 w-7 rounded-md" />
                  <span className="text-sm font-semibold">{a.name}</span>
                  {a.id === target.id && <Badge variant="brand">Target</Badge>}
                </div>
                {ins.positioning && <p className="mt-1.5 text-xs text-muted-foreground">{ins.positioning}</p>}
                <div className="mt-2 space-y-1">
                  {ins.strengths.map((s, i) => (
                    <p key={`s${i}`} className="flex items-start gap-1.5 text-xs text-slate-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" /> {s}</p>
                  ))}
                  {ins.weaknesses.map((w, i) => (
                    <p key={`w${i}`} className="flex items-start gap-1.5 text-xs text-slate-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" /> {w}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Screenshots */}
      <Card className="p-5">
        <h3 className="mb-4 font-display font-semibold">App Store screenshots</h3>
        <div className="space-y-5">
          {apps.map((a) => {
            const shots = (a.screenshots.length ? a.screenshots : a.ipadScreenshots).slice(0, 8);
            if (!shots.length) return null;
            return (
              <div key={a.id}>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.icon} alt="" className="h-5 w-5 rounded" /> {a.name}
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {shots.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt={`${a.name} screenshot ${i + 1}`} className="h-64 shrink-0 rounded-lg border border-border" loading="lazy" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
