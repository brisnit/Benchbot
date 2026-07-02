"use client";

import * as React from "react";
import { CalendarClock, Loader2, Play, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function WeeklyAudits({
  eligible,
  initialEnabled,
}: {
  eligible: boolean;
  initialEnabled: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [saving, setSaving] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast({ title: next ? "Weekly audits enabled" : "Weekly audits disabled", variant: "success" });
    } catch (e) {
      setEnabled(!next);
      toast({ title: "Couldn't update", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunning(true);
    try {
      const res = await fetch("/api/workspace/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      toast({
        title: `Re-audited ${d.ran} site${d.ran === 1 ? "" : "s"}`,
        description: d.emailed ? "A summary email was sent." : "Summary logged (add RESEND_API_KEY to email it).",
        variant: "success",
      });
      router.refresh();
    } catch (e) {
      toast({ title: "Couldn't run", description: (e as Error).message, variant: "error" });
    } finally {
      setRunning(false);
    }
  }

  if (!eligible) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-slate-500">
          <Lock className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">Weekly automated audits</p>
          <p className="text-xs text-muted-foreground">
            Automatically re-audit your sites every week and get an email summary. Available on{" "}
            <Link href="/pricing" className="font-medium text-brand hover:underline">Professional &amp; Agency</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Weekly automated audits</p>
            <p className="text-xs text-muted-foreground">Re-audit every tracked site each week; email a summary with score changes.</p>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", enabled ? "bg-brand" : "bg-secondary")}
          aria-label="Toggle weekly audits"
        >
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", enabled ? "translate-x-[22px]" : "translate-x-0.5")} />
        </button>
      </div>
      <div className="mt-3">
        <Button variant="secondary" size="sm" onClick={runNow} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run weekly audits now
        </Button>
      </div>
    </div>
  );
}
