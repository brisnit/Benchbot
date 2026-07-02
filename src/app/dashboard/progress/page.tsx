import Link from "next/link";
import { LineChart, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listAudits, getAuditBundle } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressChart, type Series } from "@/components/charts/line-chart";
import { ScoreRing } from "@/components/ui/score";
import { hostFromUrl, formatDate } from "@/lib/utils";

export const metadata = { title: "Progress · BenchBot" };

interface Point {
  date: string;
  overall: number;
  ux: number;
  mobile: number;
  content: number;
  conversion: number;
  ai: number;
}

const SERIES_META: { key: keyof Omit<Point, "date">; name: string; color: string }[] = [
  { key: "overall", name: "Overall", color: "#3552E6" },
  { key: "ux", name: "UX", color: "#7C5CFC" },
  { key: "mobile", name: "Mobile", color: "#16C098" },
  { key: "content", name: "Content", color: "#F5A524" },
  { key: "conversion", name: "Conversion", color: "#F31268" },
  { key: "ai", name: "AI visibility", color: "#0EA5E9" },
];

export default async function ProgressPage() {
  const { workspace } = await requireSession();
  const audits = listAudits(workspace.id).filter((a) => a.status === "complete");

  // Group by target host and build a time series from each audit's target score.
  const groups = new Map<string, { name: string; points: Point[] }>();
  for (const audit of audits) {
    const bundle = getAuditBundle(audit.id);
    const score = bundle?.scores.find((s) => s.competitor_id === null);
    const overall = bundle?.report?.report_json.overall_score;
    if (!score || overall == null) continue;
    const host = hostFromUrl(audit.target_url);
    if (!groups.has(host)) groups.set(host, { name: audit.target_name, points: [] });
    groups.get(host)!.points.push({
      date: formatDate(audit.completed_at || audit.created_at),
      overall,
      ux: score.ux_score,
      mobile: score.mobile_score,
      content: score.content_score,
      conversion: score.conversion_score,
      ai: score.ai_visibility_score,
    });
  }

  // oldest → newest for each site
  const sites = [...groups.entries()].map(([host, g]) => ({
    host,
    name: g.name,
    points: g.points.slice().reverse(),
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Website progress"
        description="Track how each site's scores improve over time. Run an audit again to add a new data point."
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
            const labels = site.points.map((p) => p.date);
            const series: Series[] = SERIES_META.map((m) => ({
              name: m.name,
              color: m.color,
              values: site.points.map((p) => p[m.key]),
            }));
            const latest = site.points[site.points.length - 1];
            const first = site.points[0];
            const delta = site.points.length > 1 ? latest.overall - first.overall : 0;

            return (
              <Card key={site.host} className="p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <ScoreRing score={latest.overall} label="Overall" size={92} stroke={8} />
                    <div>
                      <h2 className="font-display text-lg font-bold">{site.name}</h2>
                      <p className="font-mono text-xs text-muted-foreground">{site.host}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {site.points.length > 1 ? (
                          <Badge variant={delta > 0 ? "good" : delta < 0 ? "critical" : "secondary"} className="gap-1">
                            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {delta > 0 ? "+" : ""}{delta} overall since first audit
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Run another audit to see the trend line.</span>
                        )}
                        <span className="text-xs text-muted-foreground">{site.points.length} audit{site.points.length === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <ProgressChart labels={labels} series={series} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
