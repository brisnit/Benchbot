import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getAppComparison, userInWorkspace } from "@/lib/db";
import { AppComparisonView } from "@/components/apps/app-compare";

export const metadata = { title: "App comparison · BenchBot" };

export default async function SavedAppComparisonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireSession();
  const rec = getAppComparison(id);
  if (!rec || !userInWorkspace(user.id, rec.workspace_id)) notFound();

  const target = rec.apps.find((a) => a.id === rec.target_id) ?? rec.apps[0];
  const competitors = rec.apps.filter((a) => a.id !== target.id);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard/audits" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All audits
      </Link>
      <AppComparisonView data={{ id: rec.id, target, competitors, apps: rec.apps, comparison: rec.comparison }} />
    </div>
  );
}
