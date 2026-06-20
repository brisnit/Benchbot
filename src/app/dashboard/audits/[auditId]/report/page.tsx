import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getAuditBundle, userInWorkspace } from "@/lib/db";
import { isRunning } from "@/lib/audit-helpers";
import { AuditTopbar } from "@/components/audit/audit-topbar";
import { ReportBuilder } from "@/components/audit/report-builder";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ auditId: string }>;
}) {
  const { auditId } = await params;
  const { user } = await requireSession();
  const bundle = getAuditBundle(auditId);
  if (!bundle || !userInWorkspace(user.id, bundle.audit.workspace_id)) notFound();
  if (bundle.audit.status === "draft" || isRunning(bundle.audit.status)) {
    redirect(`/dashboard/audits/${auditId}`);
  }
  if (!bundle.report) redirect(`/dashboard/audits/${auditId}`);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="print:hidden">
        <AuditTopbar audit={bundle.audit} overallScore={bundle.report.report_json.overall_score} />
      </div>
      <ReportBuilder
        executiveSummary={bundle.report.executive_summary}
        fullMarkdown={bundle.report.full_report_markdown}
        targetName={bundle.audit.target_name}
        auditId={bundle.audit.id}
      />
    </div>
  );
}
