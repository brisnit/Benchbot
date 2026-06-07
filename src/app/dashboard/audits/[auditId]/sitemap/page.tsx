import { notFound, redirect } from "next/navigation";
import { GitBranch } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getAuditBundle, userInWorkspace } from "@/lib/db";
import { isRunning } from "@/lib/audit-helpers";
import { AuditTopbar } from "@/components/audit/audit-topbar";
import { SectionCard } from "@/components/audit/section-card";
import { SitemapGallery, type SitemapItem } from "@/components/audit/sitemap-gallery";
import { Badge } from "@/components/ui/badge";
import { hostFromUrl, nameFromUrl } from "@/lib/utils";

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

  const { audit } = bundle;
  const targetSitemap = bundle.sitemaps.find((s) => s.competitor_id === null);

  // Build the full set of sitemap cards: target first, then competitors.
  const items: SitemapItem[] = [];
  if (targetSitemap) {
    items.push({
      sitemap: targetSitemap,
      name: audit.target_name || nameFromUrl(audit.target_url),
      host: hostFromUrl(audit.target_url),
      isTarget: true,
    });
  }
  for (const s of bundle.sitemaps.filter((s) => s.competitor_id !== null)) {
    const comp = bundle.competitors.find((c) => c.id === s.competitor_id);
    items.push({
      sitemap: s,
      name: comp?.name ?? "Competitor",
      host: comp ? hostFromUrl(comp.url) : "",
      isTarget: false,
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AuditTopbar audit={audit} overallScore={bundle.report?.report_json.overall_score} />

      <SectionCard
        icon={GitBranch}
        title="Visual Sitemaps"
        description="Every site's information architecture as a card — click any to open the full diagram and save it as a PDF."
        action={
          <Badge variant="secondary">
            {items.length} site{items.length === 1 ? "" : "s"}
          </Badge>
        }
      >
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sitemaps were generated for this audit.</p>
        ) : (
          <SitemapGallery items={items} />
        )}
      </SectionCard>

      {/* Structural flags for the target */}
      {targetSitemap && (
        <SectionCard icon={GitBranch} title="Structural flags" description={`For ${audit.target_name}.`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#B5740B]">Duplicate sections</p>
              <div className="flex flex-wrap gap-1.5">
                {targetSitemap.duplicate_sections.length ? (
                  targetSitemap.duplicate_sections.map((d) => (
                    <Badge key={d} variant="warn">{d}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">None detected.</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-critical">Missing common sections</p>
              <div className="flex flex-wrap gap-1.5">
                {targetSitemap.missing_sections.length ? (
                  targetSitemap.missing_sections.map((m) => (
                    <Badge key={m} variant="critical">{m}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">All common sections present.</span>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
