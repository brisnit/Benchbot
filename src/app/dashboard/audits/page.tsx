import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getReport, listAudits, listCompetitors, listAppComparisons } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AuditCard } from "@/components/dashboard/audit-card";
import { AppComparisonCard } from "@/components/dashboard/app-comparison-card";

export const metadata = { title: "Audits · BenchBot" };

export default async function AuditsPage() {
  const { workspace } = await requireSession();
  const audits = listAudits(workspace.id);
  const appComparisons = listAppComparisons(workspace.id);

  // merge into one timeline, newest first
  const items = [
    ...audits.map((a) => ({ kind: "web" as const, created_at: a.created_at, audit: a })),
    ...appComparisons.map((r) => ({ kind: "app" as const, created_at: r.created_at, record: r })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Audits" description="Every competitive audit in this workspace.">
        <Button asChild variant="gradient">
          <Link href="/dashboard/audits/new">
            <Plus className="h-4 w-4" /> New audit
          </Link>
        </Button>
      </PageHeader>

      {items.length === 0 ? (
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
          {items.map((item) =>
            item.kind === "web" ? (
              <AuditCard
                key={item.audit.id}
                audit={item.audit}
                competitorCount={listCompetitors(item.audit.id).filter((c) => c.selected).length}
                overallScore={getReport(item.audit.id)?.report_json.overall_score ?? null}
              />
            ) : (
              <AppComparisonCard key={item.record.id} record={item.record} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
