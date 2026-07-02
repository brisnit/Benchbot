import type { AuditBundle, FindingPriority, ImprovementTask } from "@/lib/types";
import { clampScore } from "@/lib/utils";

// Derives prioritised improvement tasks from an audit's target findings, with
// an estimated score impact and effort for each. Deterministic per audit.

const PRIORITY_RANK: Record<FindingPriority, number> = { high: 0, medium: 1, low: 2 };

function effortFor(priority: FindingPriority, category: string): { hours: number; label: string } {
  const structural = /architecture|navigation|findability|conversion|mobile/i.test(category);
  if (priority === "high") return structural ? { hours: 16, label: "1–2 days" } : { hours: 8, label: "~1 day" };
  if (priority === "medium") return { hours: 4, label: "~half a day" };
  return { hours: 1, label: "1–2 hours" };
}

export function buildTasksForAudit(bundle: AuditBundle): ImprovementTask[] {
  const now = new Date().toISOString();
  // Target-site findings only (competitor_id === null).
  const findings = bundle.findings
    .filter((f) => f.competitor_id === null && f.recommendation)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.score - b.score)
    .slice(0, 12);

  return findings.map((f, i) => {
    // Estimated uplift scales with how far the dimension is from excellent.
    const gap = Math.max(0, 100 - f.score);
    const weight = f.priority === "high" ? 0.28 : f.priority === "medium" ? 0.18 : 0.1;
    const impact = clampScore(Math.round(gap * weight)) || (f.priority === "high" ? 8 : 3);
    const effort = effortFor(f.priority, f.category);
    return {
      id: `tsk_${bundle.audit.id}_${i}`,
      audit_id: bundle.audit.id,
      title: f.recommendation.length > 90 ? f.recommendation.slice(0, 88) + "…" : f.recommendation,
      description: f.evidence,
      category: f.category,
      priority: f.priority,
      impact_points: impact,
      impact_label: `+${impact} ${f.category.split(" ")[0]} score`,
      effort_hours: effort.hours,
      effort_label: effort.label,
      completed: false,
      created_at: now,
    };
  });
}
