"use client";

import * as React from "react";
import { ListChecks, TrendingUp, Clock, Check } from "lucide-react";
import { SectionCard } from "@/components/audit/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ImprovementTask, FindingPriority } from "@/lib/types";

const PRIORITY: Record<FindingPriority, { label: string; variant: "critical" | "warn" | "secondary" }> = {
  high: { label: "High priority", variant: "critical" },
  medium: { label: "Medium", variant: "warn" },
  low: { label: "Low", variant: "secondary" },
};

export function ImprovementTasks({ auditId, initialTasks }: { auditId: string; initialTasks: ImprovementTask[] }) {
  const [tasks, setTasks] = React.useState(initialTasks);
  const done = tasks.filter((t) => t.completed).length;
  const totalImpact = tasks.filter((t) => !t.completed).reduce((s, t) => s + t.impact_points, 0);

  async function toggle(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    try {
      await fetch(`/api/audits/${auditId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id }),
      });
    } catch {
      // revert on failure
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    }
  }

  if (tasks.length === 0) return null;

  // incomplete first, ordered by priority already
  const ordered = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));

  return (
    <SectionCard
      icon={ListChecks}
      title="Improvement Tasks"
      description="Prioritised, actionable next steps generated from this audit — with estimated impact and effort."
      id="tasks"
      action={
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{done}/{tasks.length} done</Badge>
          {totalImpact > 0 && <Badge variant="good" className="gap-1"><TrendingUp className="h-3 w-3" /> +{totalImpact} potential</Badge>}
        </div>
      }
    >
      {/* progress bar */}
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-brand-gradient transition-all" style={{ width: `${Math.round((done / tasks.length) * 100)}%` }} />
      </div>

      <ul className="space-y-2">
        {ordered.map((t) => {
          const p = PRIORITY[t.priority];
          return (
            <li
              key={t.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3.5 transition-colors",
                t.completed ? "border-border bg-secondary/40" : "border-border hover:border-brand/30",
              )}
            >
              <button
                onClick={() => toggle(t.id)}
                aria-label={t.completed ? "Mark incomplete" : "Mark complete"}
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  t.completed ? "border-good bg-good text-white" : "border-slate-300 hover:border-brand",
                )}
              >
                {t.completed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn("text-sm font-medium", t.completed ? "text-muted-foreground line-through" : "text-ink")}>{t.title}</p>
                </div>
                {!t.completed && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant={p.variant}>{p.label}</Badge>
                  <span className="inline-flex items-center gap-1 rounded-md bg-good/10 px-2 py-0.5 text-xs font-medium text-good">
                    <TrendingUp className="h-3 w-3" /> {t.impact_label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-slate-600">
                    <Clock className="h-3 w-3" /> {t.effort_label}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
