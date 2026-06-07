import type { AuditStatus } from "@/lib/types";
import { AUDIT_PIPELINE } from "@/lib/constants";

export const STATUS_LABELS: Record<AuditStatus, string> = {
  draft: "Draft",
  finding_competitors: "Finding competitors",
  capturing_screenshots: "Capturing screenshots",
  mapping_navigation: "Mapping navigation",
  generating_sitemap: "Generating sitemap",
  reviewing_ux: "Reviewing UX patterns",
  scoring_heuristics: "Scoring heuristics",
  finding_content_gaps: "Finding content gaps",
  building_report: "Building report",
  complete: "Complete",
  failed: "Failed",
};

export function isRunning(status: AuditStatus): boolean {
  return (
    status !== "draft" &&
    status !== "complete" &&
    status !== "failed"
  );
}

export function statusVariant(
  status: AuditStatus,
): "good" | "warn" | "critical" | "brand" | "secondary" {
  if (status === "complete") return "good";
  if (status === "failed") return "critical";
  if (status === "draft") return "secondary";
  return "brand";
}

export function progressForStatus(status: AuditStatus): number {
  if (status === "draft") return 0;
  if (status === "failed") return 100;
  return AUDIT_PIPELINE.find((s) => s.status === status)?.progress ?? 0;
}
