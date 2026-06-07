import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera, GitBranch, FileText } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getAuditBundle, userInWorkspace } from "@/lib/db";
import { isRunning } from "@/lib/audit-helpers";
import { RunView } from "@/components/audit/run-view";
import { AuditTopbar } from "@/components/audit/audit-topbar";
import { Button } from "@/components/ui/button";
import {
  ExecutiveSummarySection,
  CompetitorMatrixSection,
  HeuristicReviewSection,
  VisualSitemapSection,
  IAComparisonSection,
  ContentGapSection,
  ConversionAuditSection,
  AiVisibilitySection,
} from "@/components/audit/sections";

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ auditId: string }>;
}) {
  const { auditId } = await params;
  const { user } = await requireSession();
  const bundle = getAuditBundle(auditId);
  if (!bundle || !userInWorkspace(user.id, bundle.audit.workspace_id)) notFound();

  const { audit, report, scores, screenshots, sitemaps } = bundle;

  // Still running (or queued) → progress screen.
  if (audit.status === "draft" || isRunning(audit.status)) {
    return (
      <RunView
        auditId={audit.id}
        initialStatus={audit.status}
        initialProgress={audit.progress}
        targetName={audit.target_name}
      />
    );
  }

  // Failed with no usable data.
  if (audit.status === "failed" || !report) {
    return (
      <div className="mx-auto max-w-3xl">
        <AuditTopbar audit={audit} />
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-warn" />
          <h2 className="mt-3 text-lg font-semibold">This audit didn&apos;t complete</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {audit.error ?? "The crawl couldn't be completed. Try running it again."}
          </p>
        </div>
      </div>
    );
  }

  const targetSitemap = sitemaps.find((s) => s.competitor_id === null);

  return (
    <div className="mx-auto max-w-6xl">
      <AuditTopbar audit={audit} overallScore={report.report_json.overall_score} />

      {audit.error && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-[#B5740B]">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {audit.error} Partial results are shown below.
        </div>
      )}

      <div className="space-y-6">
        <ExecutiveSummarySection report={report} />
        <CompetitorMatrixSection scores={scores} />

        {/* quick links to dedicated views */}
        <div className="grid gap-4 sm:grid-cols-3">
          <QuickLink href={`/dashboard/audits/${audit.id}/screenshots`} icon={Camera} title="Screenshots library" meta={`${screenshots.length} captures`} />
          <QuickLink href={`/dashboard/audits/${audit.id}/sitemap`} icon={GitBranch} title="Visual sitemap" meta={`${targetSitemap?.page_count ?? 0} pages`} />
          <QuickLink href={`/dashboard/audits/${audit.id}/report`} icon={FileText} title="Client-ready report" meta="Copy & export" />
        </div>

        <HeuristicReviewSection report={report} />
        <VisualSitemapSection sitemap={targetSitemap} />
        <IAComparisonSection report={report} />
        <ContentGapSection report={report} />
        <ConversionAuditSection report={report} />
        <AiVisibilitySection report={report} />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  meta,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-brand/40 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{meta}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-brand" />
    </Link>
  );
}
