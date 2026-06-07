import { notFound, redirect } from "next/navigation";
import { GitBranch } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getAuditBundle, userInWorkspace } from "@/lib/db";
import { isRunning } from "@/lib/audit-helpers";
import { AuditTopbar } from "@/components/audit/audit-topbar";
import { VisualSitemapSection } from "@/components/audit/sections";
import { SitemapDiagram } from "@/components/audit/sitemap-diagram";
import { SectionCard } from "@/components/audit/section-card";
import { hostFromUrl } from "@/lib/utils";

export default async function SitemapPage({
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

  const targetSitemap = bundle.sitemaps.find((s) => s.competitor_id === null);
  const competitorSitemaps = bundle.sitemaps.filter((s) => s.competitor_id !== null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AuditTopbar audit={bundle.audit} overallScore={bundle.report?.report_json.overall_score} />
      <VisualSitemapSection sitemap={targetSitemap} />

      {competitorSitemaps.length > 0 && (
        <SectionCard icon={GitBranch} title="Competitor sitemaps" description="How each competitor structures their site.">
          <div className="grid gap-4 md:grid-cols-2">
            {competitorSitemaps.map((s) => {
              const comp = bundle.competitors.find((c) => c.id === s.competitor_id);
              return (
                <div key={s.id}>
                  <p className="mb-2 text-sm font-semibold">
                    {comp?.name ?? "Competitor"}{" "}
                    <span className="font-mono text-xs font-normal text-muted-foreground">
                      · {s.page_count.toLocaleString()} pages · depth {s.depth}
                    </span>
                  </p>
                  <SitemapDiagram
                    tree={s.tree}
                    pageCount={s.page_count}
                    depth={s.depth}
                    host={comp ? hostFromUrl(comp.url) : undefined}
                  />
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
