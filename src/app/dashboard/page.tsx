import Link from "next/link";
import {
  Plus,
  ClipboardList,
  Sparkles,
  TrendingUp,
  Bookmark,
  ArrowRight,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getReport, listAudits, listCompetitors, getUsage } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AuditCard } from "@/components/dashboard/audit-card";
import { UsageCard } from "@/components/billing/usage-card";

export default async function DashboardHome() {
  const { user, workspace } = await requireSession();
  const audits = listAudits(workspace.id);
  const recent = audits.slice(0, 6);
  const completed = audits.filter((a) => a.status === "complete").length;
  const usage = getUsage(workspace.id);

  const firstName = (user.name || "there").split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what's happening across your competitive audits."
      >
        <Button asChild variant="gradient">
          <Link href="/dashboard/audits/new">
            <Plus className="h-4 w-4" /> New audit
          </Link>
        </Button>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-2xl font-bold">{audits.length}</p>
              <p className="text-xs text-muted-foreground">Total audits</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-good/10 text-good">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-2xl font-bold">{completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        {/* Usage / plan card */}
        <UsageCard usage={usage} />
      </div>

      {/* Recent audits */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent audits</h2>
          {audits.length > 0 && (
            <Link
              href="/dashboard/audits"
              className="flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Run your first competitive audit"
            description="Enter a website, pick competitors, and BenchBot will deliver a full UX and strategy report in minutes."
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
            {recent.map((audit) => (
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

      {/* Saved competitor sets placeholder */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Saved competitor sets</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bookmark className="h-4 w-4 text-brand" /> No saved sets yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Save the competitors you analyse most often and reuse them across audits. Saved sets
              will appear here.
            </p>
            <Button variant="secondary" size="sm" className="mt-4" disabled>
              <Bookmark className="h-4 w-4" /> Save a set (coming soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
