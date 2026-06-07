"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AUDIT_PIPELINE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AuditStatus } from "@/lib/types";

const ORDER: AuditStatus[] = AUDIT_PIPELINE.map((s) => s.status);

export function RunView({
  auditId,
  initialStatus,
  initialProgress,
  targetName,
}: {
  auditId: string;
  initialStatus: AuditStatus;
  initialProgress: number;
  targetName: string;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<AuditStatus>(initialStatus);
  const [progress, setProgress] = React.useState(initialProgress);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/audits/${auditId}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setStatus(data.status);
        setProgress(data.progress);
        setError(data.error);
        if (data.status === "complete" || data.status === "failed") {
          clearInterval(interval);
          // brief pause so the user sees "Complete", then load results
          setTimeout(() => router.refresh(), 900);
        }
      } catch {
        /* keep polling */
      }
    }, 1200);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [auditId, router]);

  const currentIndex = ORDER.indexOf(status);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white">
            {status === "failed" ? (
              <AlertTriangle className="h-7 w-7" />
            ) : status === "complete" ? (
              <Check className="h-7 w-7" />
            ) : (
              <Loader2 className="h-7 w-7 animate-spin" />
            )}
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight">
            {status === "complete"
              ? "Audit complete"
              : status === "failed"
                ? "Audit failed"
                : `Benchmarking ${targetName}…`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "complete"
              ? "Loading your report…"
              : status === "failed"
                ? error ?? "Something went wrong."
                : "This usually takes a couple of minutes. You can keep this tab open."}
          </p>
        </div>

        <div className="mt-6">
          <Progress value={progress} />
          <p className="mt-2 text-right font-mono text-xs text-muted-foreground">{progress}%</p>
        </div>

        <ol className="mt-6 space-y-2">
          {AUDIT_PIPELINE.filter((s) => s.status !== "complete").map((stageItem, i) => {
            const done = i < currentIndex || status === "complete";
            const active = i === currentIndex && status !== "complete";
            return (
              <li
                key={stageItem.status}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors",
                  active && "border-brand/40 bg-brand-50/50",
                  done && "border-border bg-secondary/40",
                  !done && !active && "border-border",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    done && "bg-good text-white",
                    active && "bg-brand text-white",
                    !done && !active && "bg-secondary text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : i + 1}
                </span>
                <span className={cn("text-sm", active ? "font-medium text-ink" : done ? "text-slate-600" : "text-muted-foreground")}>
                  {stageItem.label}
                </span>
              </li>
            );
          })}
        </ol>

        {error && status !== "failed" && (
          <p className="mt-4 rounded-lg bg-warn/10 px-3 py-2 text-xs text-[#B5740B]">{error}</p>
        )}
      </div>
    </div>
  );
}
