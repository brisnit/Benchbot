"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Loader2,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { cn, hostFromUrl, nameFromUrl, normalizeUrl } from "@/lib/utils";
import {
  AUDIT_GOALS,
  CRAWL_OPTIONS,
  DEVICE_MODES,
  MAX_COMPETITORS,
  SITE_TYPES,
} from "@/lib/constants";
import type { AuditGoal, CompetitorType, DeviceMode, SiteType } from "@/lib/types";

interface CompetitorChoice {
  name: string;
  url: string;
  competitor_type: CompetitorType;
  reason: string;
  selected: boolean;
}

const STEPS = ["Website", "Goal", "Competitors", "Crawl", "Review"];

export function NewAuditWizard({ isGuest = true, canRun = true }: { isGuest?: boolean; canRun?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

  // step 1
  const [url, setUrl] = React.useState("");
  const [siteType, setSiteType] = React.useState<SiteType>("saas");
  const [urlError, setUrlError] = React.useState<string | null>(null);

  // step 2
  const [goal, setGoal] = React.useState<AuditGoal>("full_benchmark");

  // step 3
  const [discovering, setDiscovering] = React.useState(false);
  const [discovered, setDiscovered] = React.useState(false);
  const [source, setSource] = React.useState<"web_search" | "ai_estimate" | "sample">("ai_estimate");
  const [targetSummary, setTargetSummary] = React.useState<string>("");
  const [competitors, setCompetitors] = React.useState<CompetitorChoice[]>([]);
  const [customUrl, setCustomUrl] = React.useState("");

  // step 4
  const [deviceMode, setDeviceMode] = React.useState<DeviceMode>("both");
  const [crawl, setCrawl] = React.useState<string[]>(["homepage", "navigation", "footer", "schema_geo"]);

  const selectedCount = competitors.filter((c) => c.selected).length;

  function validateUrl(): boolean {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setUrlError("Enter a valid website URL, e.g. acme.com");
      return false;
    }
    setUrlError(null);
    return true;
  }

  async function runDiscovery() {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    setDiscovering(true);
    try {
      const res = await fetch("/api/competitors/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: normalized, siteType, auditGoal: goal }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Discovery failed");
      const data = await res.json();
      const map = (arr: { name: string; url: string; reason: string }[], type: CompetitorType) =>
        arr.map((c, i) => ({
          name: c.name,
          url: c.url,
          competitor_type: type,
          reason: c.reason,
          selected: i < 3, // pre-select the first few
        }));
      const merged = [
        ...map(data.directCompetitors ?? [], "direct"),
        ...map(data.indirectCompetitors ?? [], "indirect"),
        ...map(data.inspirationSites ?? [], "inspiration"),
      ];
      // cap initial selections to MAX
      let count = 0;
      for (const c of merged) {
        if (c.selected) {
          count++;
          if (count > MAX_COMPETITORS) c.selected = false;
        }
      }
      setCompetitors(merged);
      setSource(data.source ?? (data.aiEstimated ? "ai_estimate" : "web_search"));
      setTargetSummary(typeof data.targetSummary === "string" ? data.targetSummary : "");
      setDiscovered(true);
    } catch (err) {
      toast({ title: "Couldn't suggest competitors", description: (err as Error).message, variant: "error" });
    } finally {
      setDiscovering(false);
    }
  }

  function toggleCompetitor(idx: number) {
    setCompetitors((prev) => {
      const next = [...prev];
      const c = next[idx];
      if (!c.selected && selectedCount >= MAX_COMPETITORS) {
        toast({ title: `Limit reached`, description: `You can select up to ${MAX_COMPETITORS} competitors.`, variant: "error" });
        return prev;
      }
      next[idx] = { ...c, selected: !c.selected };
      return next;
    });
  }

  function addCustom() {
    const normalized = normalizeUrl(customUrl);
    if (!normalized) {
      toast({ title: "Invalid URL", description: "Enter a valid competitor URL.", variant: "error" });
      return;
    }
    if (competitors.some((c) => hostFromUrl(c.url) === hostFromUrl(normalized))) {
      toast({ title: "Already added", variant: "error" });
      return;
    }
    if (selectedCount >= MAX_COMPETITORS) {
      toast({ title: "Limit reached", description: `Up to ${MAX_COMPETITORS} competitors.`, variant: "error" });
      return;
    }
    setCompetitors((prev) => [
      ...prev,
      { name: nameFromUrl(normalized), url: normalized, competitor_type: "custom", reason: "Added manually", selected: true },
    ]);
    setCustomUrl("");
  }

  function removeCompetitor(idx: number) {
    setCompetitors((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleCrawl(value: string) {
    setCrawl((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function next() {
    if (step === 0) {
      if (!validateUrl()) return;
    }
    if (step === 1 && !discovered) {
      setStep(2);
      void runDiscovery();
      return;
    }
    if (step === 2 && selectedCount === 0) {
      toast({ title: "Pick at least one competitor", variant: "error" });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function startAudit() {
    // Out of audits → show the upgrade prompt instead of starting.
    if (!canRun) {
      setUpgradeOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const normalized = normalizeUrl(url)!;
      // 1. create audit
      const createRes = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: normalized,
          siteType,
          auditGoal: goal,
          deviceMode,
          crawlSettings: crawl,
        }),
      });
      if (createRes.status === 402) {
        setUpgradeOpen(true);
        setSubmitting(false);
        return;
      }
      if (!createRes.ok) throw new Error((await createRes.json()).error ?? "Could not create audit");
      const { audit } = await createRes.json();

      // 2. save competitors
      const compRes = await fetch(`/api/audits/${audit.id}/competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitors: competitors
            .filter((c) => c.selected)
            .map((c) => ({
              name: c.name,
              url: c.url,
              competitor_type: c.competitor_type,
              reason: c.reason,
              selected: true,
            })),
        }),
      });
      if (!compRes.ok) throw new Error((await compRes.json()).error ?? "Could not save competitors");

      // 3. run
      const runRes = await fetch(`/api/audits/${audit.id}/run`, { method: "POST" });
      if (!runRes.ok) throw new Error((await runRes.json()).error ?? "Could not start audit");

      router.push(`/dashboard/audits/${audit.id}`);
    } catch (err) {
      toast({ title: "Something went wrong", description: (err as Error).message, variant: "error" });
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i < step && "bg-good text-white",
                i === step && "bg-brand text-white",
                i > step && "bg-secondary text-muted-foreground",
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn("hidden text-sm font-medium sm:block", i === step ? "text-ink" : "text-muted-foreground")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 hidden h-px flex-1 bg-border sm:block" />}
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {/* STEP 1 */}
        {step === 0 && (
          <div className="space-y-5">
            <StepHeading icon={Globe} title="Which website are we auditing?" subtitle="Enter the site you want to benchmark and tell us what kind of site it is." />
            <div className="space-y-1.5">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                placeholder="acme.com"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(null); }}
                onBlur={() => url && validateUrl()}
                autoFocus
              />
              {urlError && <p className="text-sm text-critical">{urlError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Site type</Label>
              <Select value={siteType} onValueChange={(v) => setSiteType(v as SiteType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SITE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 1 && (
          <div className="space-y-5">
            <StepHeading icon={Target} title="What's the goal of this audit?" subtitle="We'll tailor the analysis and recommendations to your objective." />
            <div className="grid gap-3 sm:grid-cols-2">
              {AUDIT_GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-all",
                    goal === g.value ? "border-brand bg-brand-50/60 ring-1 ring-brand/30" : "border-border hover:border-brand/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-semibold">{g.label}</span>
                    {goal === g.value && <Check className="h-4 w-4 text-brand" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{g.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 2 && (
          <div className="space-y-5">
            <StepHeading
              icon={Sparkles}
              title="Choose your competitors"
              subtitle={`Select up to ${MAX_COMPETITORS}. We grouped AI suggestions — add your own too.`}
            />

            {discovered && source === "web_search" && (
              <div className="flex items-start gap-2 rounded-lg border border-good/30 bg-good/10 px-3 py-2 text-xs text-good">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Found via live web search, grounded in {hostFromUrl(url)}&apos;s homepage. Review and
                  adjust before running.
                </span>
              </div>
            )}
            {discovered && source === "ai_estimate" && (
              <div className="flex items-start gap-2 rounded-lg border border-violet-50 bg-violet-50/50 px-3 py-2 text-xs text-violet">
                <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  AI-estimated from {targetSummary ? `${hostFromUrl(url)}'s homepage` : "the site profile"}{" "}
                  (live web search unavailable). Review and adjust before running.
                </span>
              </div>
            )}
            {discovered && source === "sample" && (
              <div className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-[#B5740B]">
                <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Sample suggestions (no OpenAI key set). Add your own competitors below, or set
                  OPENAI_API_KEY for real, web-searched results.
                </span>
              </div>
            )}

            {discovering ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 rounded-lg" />
                ))}
                <p className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Finding competitors…
                </p>
              </div>
            ) : (
              <>
                {(["direct", "indirect", "inspiration"] as CompetitorType[]).map((type) => {
                  const group = competitors
                    .map((c, idx) => ({ c, idx }))
                    .filter(({ c }) => c.competitor_type === type);
                  if (group.length === 0) return null;
                  return (
                    <div key={type}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {GROUP_LABELS[type]}
                      </p>
                      <div className="space-y-2">
                        {group.map(({ c, idx }) => (
                          <CompetitorRow key={c.url} c={c} onToggle={() => toggleCompetitor(idx)} />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* custom */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add your own</p>
                  {competitors.filter((c) => c.competitor_type === "custom").map((c) => {
                    const idx = competitors.indexOf(c);
                    return (
                      <div key={c.url} className="mb-2 flex items-center justify-between rounded-lg border border-brand/30 bg-brand-50/40 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={c.selected} onCheckedChange={() => toggleCompetitor(idx)} />
                          <div>
                            <p className="text-sm font-medium">{c.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{hostFromUrl(c.url)}</p>
                          </div>
                        </div>
                        <button onClick={() => removeCompetitor(idx)} className="text-muted-foreground hover:text-critical">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <Input
                      placeholder="competitor.com"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                    />
                    <Button type="button" variant="secondary" onClick={addCustom}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Selected</span>
                  <Badge variant={selectedCount > 0 ? "brand" : "secondary"}>
                    {selectedCount}/{MAX_COMPETITORS}
                  </Badge>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 4 */}
        {step === 3 && (
          <div className="space-y-5">
            <StepHeading icon={Globe} title="Crawl settings" subtitle="Tell BenchBot what to inspect and on which devices." />
            <div>
              <Label className="mb-2 block">Areas to inspect</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {CRAWL_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm transition-colors",
                      crawl.includes(opt.value) ? "border-brand/40 bg-brand-50/40" : "border-border hover:bg-secondary",
                    )}
                  >
                    <Checkbox checked={crawl.includes(opt.value)} onCheckedChange={() => toggleCrawl(opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Devices</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {DEVICE_MODES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDeviceMode(d.value)}
                    className={cn(
                      "rounded-lg border p-3 text-sm font-medium transition-all",
                      deviceMode === d.value ? "border-brand bg-brand-50/60 ring-1 ring-brand/30" : "border-border hover:border-brand/40",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {step === 4 && (
          <div className="space-y-5">
            <StepHeading icon={Check} title="Review & run" subtitle="Confirm the details. You can re-run with different settings any time." />
            <dl className="divide-y divide-border rounded-lg border border-border">
              <ReviewRow label="Website" value={hostFromUrl(url)} />
              <ReviewRow label="Site type" value={SITE_TYPES.find((s) => s.value === siteType)?.label ?? siteType} />
              <ReviewRow label="Audit goal" value={AUDIT_GOALS.find((g) => g.value === goal)?.label ?? goal} />
              <ReviewRow label="Competitors" value={`${selectedCount} selected`} />
              <ReviewRow label="Devices" value={DEVICE_MODES.find((d) => d.value === deviceMode)?.label ?? deviceMode} />
              <ReviewRow label="Areas" value={`${crawl.length} areas`} />
            </dl>
            <div className="rounded-lg border border-violet-50 bg-violet-50/50 p-4 text-sm text-violet">
              <p className="flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4" /> Ready to benchmark</p>
              <p className="mt-1 text-violet/80">BenchBot will crawl, capture, score and build your report. This usually takes a couple of minutes.</p>
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-7 flex items-center justify-between border-t border-border pt-5">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0 || submitting}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" variant="gradient" onClick={next} disabled={discovering}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" variant="gradient" onClick={startAudit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {submitting ? "Starting…" : "Start audit"}
            </Button>
          )}
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} isGuest={isGuest} />
    </div>
  );
}

const GROUP_LABELS: Record<CompetitorType, string> = {
  direct: "Direct competitors",
  indirect: "Indirect competitors",
  inspiration: "Best-in-class inspiration",
  custom: "Added manually",
  target: "Target",
};

function CompetitorRow({ c, onToggle }: { c: CompetitorChoice; onToggle: () => void }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 transition-colors",
        c.selected ? "border-brand/40 bg-brand-50/40" : "border-border hover:bg-secondary",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Checkbox checked={c.selected} onCheckedChange={onToggle} className="mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{c.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{hostFromUrl(c.url)}</p>
          {c.reason && <p className="mt-0.5 text-xs text-slate-500">{c.reason}</p>}
        </div>
      </div>
    </label>
  );
}

function StepHeading({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
