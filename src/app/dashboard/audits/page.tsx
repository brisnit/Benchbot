import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getReport, listAudits, listCompetitors } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AuditCard } from "@/components/dashboard/audit-card";

export const metadata = { title: "Audits · BenchBot" };

export default async function AuditsPage() {
  const { workspace } = await requireSession();
  const audits = listAudits(workspace.id);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Audits" description="Every competitive audit in this workspace.">
        <Button asChild variant="gradient">
          <Link href="/dashboard/audits/new">
            <Plus className="h-4 w-4" /> New audit
          </Link>
        </Button>
      </PageHeader>

      {audits.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No audits yet"
          description="Create your first audit to benchmark a site against its competitors."
          action={
            <Button asChild variant="gradient">
              <Link href="/dashboard/audits/new">
                <Plus className="h-4 w-4" /> Create new audit
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audits.map((audit) => (
            <AuditCard
              key={audit.id}
              audit={audit}
              competitorCount={listCompetitors(audit.id).filter((c) => c.selected).length}
              overallScore={getReport(audit.id)?.report_json.overall_score ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
