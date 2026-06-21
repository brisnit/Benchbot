import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getAuditBundle, userInWorkspace } from "@/lib/db";
import { hostFromUrl, nameFromUrl } from "@/lib/utils";
import { SitemapPrintView } from "@/components/audit/sitemap-print-view";

// Standalone, chrome-free page used to print/Save-PDF a single sitemap.
// (Printing the in-modal diagram produces blank pages — this renders it as
// normal page flow instead.)
export default async function SitemapPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ auditId: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { auditId } = await params;
  const { c } = await searchParams;
  const { user } = await requireSession();

  const bundle = getAuditBundle(auditId);
  if (!bundle || !userInWorkspace(user.id, bundle.audit.workspace_id)) notFound();

  const isTarget = !c || c === "target";
  const sitemap = isTarget
    ? bundle.sitemaps.find((s) => s.competitor_id === null)
    : bundle.sitemaps.find((s) => s.competitor_id === c);
  if (!sitemap) notFound();

  let name: string;
  let host: string;
  if (isTarget) {
    name = bundle.audit.target_name || nameFromUrl(bundle.audit.target_url);
    host = hostFromUrl(bundle.audit.target_url);
  } else {
    const comp = bundle.competitors.find((x) => x.id === c);
    name = comp?.name ?? "Competitor";
    host = comp ? hostFromUrl(comp.url) : "";
  }

  return (
    <SitemapPrintView
      tree={sitemap.tree}
      pageCount={sitemap.page_count}
      depth={sitemap.depth}
      name={name}
      host={host}
    />
  );
}
