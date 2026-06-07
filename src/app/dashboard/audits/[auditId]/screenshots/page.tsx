import { notFound, redirect } from "next/navigation";
import { Camera } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getAuditBundle, userInWorkspace } from "@/lib/db";
import { isRunning } from "@/lib/audit-helpers";
import { AuditTopbar } from "@/components/audit/audit-topbar";
import { SectionCard } from "@/components/audit/section-card";
import { ScreenshotsLibrary } from "@/components/audit/screenshots-library";

export default async function ScreenshotsPage({
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

  return (
    <div className="mx-auto max-w-6xl">
      <AuditTopbar audit={bundle.audit} overallScore={bundle.report?.report_json.overall_score} />
      <SectionCard
        icon={Camera}
        title="Screenshots Library"
        description="Desktop and mobile captures across your site and competitors. Filter by page or device."
      >
        <ScreenshotsLibrary screenshots={bundle.screenshots} />
      </SectionCard>
    </div>
  );
}
