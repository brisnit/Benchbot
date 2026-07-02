import Link from "next/link";
import { LineChart, TrendingUp, TrendingDown, Minus, ArrowRight, Users } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listAudits, getAuditBundle } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressChart, type Series } from "@/components/charts/line-chart";
import { ScoreRing } from "@/components/ui/score";
import { hostFromUrl, formatDate } from "@/lib/utils";
import type { AuditScore } from "@/lib/types";

export const metadata = { title: "Progress · BenchBot" };

const overallOf = (s: AuditScore) =>
  Math.round((s.ux_score + s.mobile_score + s.navigation_score + s.content_score + s.conversion_score + s.ai_visibility_score) / 6);

const DIM_META: { key: keyof AuditScore; name: string; color: string }[] = [
  { key: "ux_score", name: "UX", color: "#7C5CFC" },
  { key: "mobile_score", name: "Mobile", color: "#16C098" },
  { key: "content_score", name: "Content", color: "#F5A524" },
  { key: "conversion_score", name: "Conversion", color: "#F31268" },
  { key: "ai_visibility_score", name: "AI visibility", color: "#0EA5E9" },
];
const COMP_COLORS = ["#7C5CFC", "#16C098", "#F5A524", "#F31268", "#0EA5E9", "#E11D48"];

interface Snap {
  date: string;
  overall: number;
  target: AuditScore;
  competitors: { host: string; name: string; overall: number }[];
}

export default async function ProgressPage() {
  const { workspace } = await requireSession();
  const audits = listAudits(workspace.id).filter((a) => a.status === "complete");

  const groups = new Map<string, { name: string; snaps: Snap[] }>();
  for (const audit of audits) {
    const bundle = getAuditBundle(audit.id);
    const target = bundle?.scores.find((s) => s.competitor_id === null);
    const overall = bundle?.report?.report_json.overall_score;
    if (!target || overall == null) continue;
    const host = hostFromUrl(audit.target_url);
    if (!groups.has(host)) groups.set(host, { name: audit.target_name, snaps: [] });
    groups.get(host)!.snaps.push({
      date: formatDate(audit.completed_at || audit.created_at),
      overall,
      target,
      competitors: (bundle?.scores ?? [])
        .filter((s) => s.competitor_id !== null)
        .map((s) => ({ host: hostFromUrl(s.url), name: s.company_name, overall: overallOf(s) })),
    });
  }

  const sites = [...groups.entries()].map(([host, g]) => ({ host, name: g.name, snaps: g.snaps.slice().reverse() }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Website progress"
        description="Track how each site's scores improve over time — and how you stack up against competitors. Re-audit to add a new data point."
      />

      {sites.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No progress to show yet"
          description="Complete an audit to start tracking scores. Re-audit the same site over time and BenchBot charts the improvement."
          action={
            <Link href="/dashboard/audits/new" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
              Run an audit <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {sites.map((site) => {
            const labels = site.snaps.map((s) => s.date);
            const dimSeries: Series[] = [
              { name: "Overall", color: "#3552E6", values: site.snaps.map((s) => s.overall) },
              ...DIM_META.map((m) => ({ name: m.name, color: m.color, values: site.snaps.map((s) => s.target[m.key] as number) })),
            ];
            const latest = site.snaps[site.snaps.length - 1];
            const first = site.snaps[0];
            const delta = site.snaps.length > 1 ? latest.overall - first.overall : 0;

            // Competitor hosts present in the latest snapshot.
            const compHosts = latest.competitors.map((c) => ({ host: c.host, name: c.name }));
            const compSeries: Series[] = [
              { name: `${site.name} (you)`, color: "#3552E6", values: site.snaps.map((s) => s.overall) },
              ...compHosts.map((c, i) => ({
                name: c.name,
                color: COMP_COLORS[i % COMP_COLORS.length],
                dashed: true,
                values: site.snaps.map((s) => s.competitors.find((x) => x.host === c.host)?.overall ?? null),
              })),
            ];

            return (
              <Card key={site.host} className="p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <ScoreRing score={latest.overall} label="Overall" size={92} stroke={8} />
                    <div>
                      <h2 className="font-display text-lg font-bold">{site.name}</h2>
                      <p className="font-mono text-xs text-muted-foreground">{site.host}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {site.snaps.length > 1 ? (
                          <Badge variant={delta > 0 ? "good" : delta < 0 ? "critical" : "secondary"} className="gap-1">
                            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {delta > 0 ? "+" : ""}{delta} overall since first audit
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Run another audit to see the trend line.</span>
                        )}
                        <span className="text-xs text-muted-foreground">{site.snaps.length} audit{site.snaps.length === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mb-1 text-sm font-semibold text-ink">Scores over time</p>
                <ProgressChart labels={labels} series={dimSeries} />

                {compHosts.length > 0 && (
                  <div className="mt-8 border-t border-border pt-5">
                    <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <Users className="h-4 w-4 text-brand" /> You vs. competitors
                    </p>
                    <ProgressChart labels={labels} series={compSeries} height={220} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
