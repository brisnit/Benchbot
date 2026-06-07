import { PageHeader } from "@/components/dashboard/page-header";
import { NewAuditWizard } from "@/components/audit/new-audit-wizard";

export const metadata = { title: "New audit · BenchBot" };

export default function NewAuditPage() {
  return (
    <div>
      <div className="mx-auto max-w-3xl">
        <PageHeader title="New competitive audit" description="Five quick steps to a full competitive UX report." />
      </div>
      <NewAuditWizard />
    </div>
  );
}
