import { PageHeader } from "@/components/dashboard/page-header";
import { NewAuditWizard } from "@/components/audit/new-audit-wizard";
import { requireSession } from "@/lib/auth";
import { getUsage } from "@/lib/db";

export const metadata = { title: "New audit · BenchBot" };

export default async function NewAuditPage() {
  const { workspace } = await requireSession();
  const usage = getUsage(workspace.id);

  return (
    <div>
      <div className="mx-auto max-w-3xl">
        <PageHeader title="New competitive audit" description="Five quick steps to a full competitive UX report." />
      </div>
      <NewAuditWizard isGuest={usage.isGuest} canRun={usage.remaining > 0} />
    </div>
  );
}
