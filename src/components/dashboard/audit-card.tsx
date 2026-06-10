import Link from "next/link";
import { Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Progress } from "@/components/ui/progress";
import { ScorePill } from "@/components/ui/score";
import { AuditCardMenu } from "@/components/dashboard/audit-card-menu";
import { auditGoalLabel } from "@/lib/constants";
import { hostFromUrl, relativeTime } from "@/lib/utils";
import { isRunning } from "@/lib/audit-helpers";
import type { Audit } from "@/lib/types";

export function AuditCard({
  audit,
  overallScore,
  competitorCount,
}: {
  audit: Audit;
  overallScore?: number | null;
  competitorCount?: number;
}) {
  const running = isRunning(audit.status);
  const href = `/dashboard/audits/${audit.id}`;
  return (
    <Card className="group relative h-full p-5 transition-all hover:border-brand/40 hover:shadow-md">
      {/* Stretched link makes the whole card clickable without nesting the menu inside an <a>. */}
      <Link href={href} className="absolute inset-0 z-0 rounded-xl" aria-label={`Open ${audit.target_name} audit`} />

      <div className="pointer-events-none relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
              <Globe className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display font-semibold text-ink">{audit.target_name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {hostFromUrl(audit.target_url)}
              </p>
            </div>
          </div>
          {/* menu re-enables pointer events for itself */}
          <div className="pointer-events-auto">
            <AuditCardMenu auditId={audit.id} href={href} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <StatusBadge status={audit.status} />
          {audit.status === "complete" && typeof overallScore === "number" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Overall <ScorePill score={overallScore} />
            </span>
          )}
        </div>

        {running && (
          <div className="mt-4">
            <Progress value={audit.progress} />
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="truncate">{auditGoalLabel(audit.audit_goal)}</span>
          <span className="shrink-0">
            {typeof competitorCount === "number" ? `${competitorCount} competitors · ` : ""}
            {relativeTime(audit.created_at)}
          </span>
        </div>
      </div>
    </Card>
  );
}
