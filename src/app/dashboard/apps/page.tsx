import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { AppCompare } from "@/components/apps/app-compare";

export const metadata = { title: "App Compare · BenchBot" };

export default async function AppComparePage() {
  await requireSession();
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="App Compare"
        description="Benchmark native apps by their App Store presence — ratings, reviews, screenshots, pricing and ASO. (iOS App Store; Android coming soon.)"
      />
      <AppCompare />
    </div>
  );
}
