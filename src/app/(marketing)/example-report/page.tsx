import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { buildExampleBundle } from "@/lib/demo/example";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScreenshotsLibrary } from "@/components/audit/screenshots-library";
import { SectionCard } from "@/components/audit/section-card";
import { Camera } from "lucide-react";
import {
  ExecutiveSummarySection,
  CompetitorMatrixSection,
  HeuristicReviewSection,
  VisualSitemapSection,
  IAComparisonSection,
  ContentGapSection,
  ConversionAuditSection,
  AiVisibilitySection,
} from "@/components/audit/sections";

export const metadata = { title: "Example report · BenchBot" };

export default function ExampleReportPage() {
  const { audit, report, scores, screenshots, sitemaps } = buildExampleBundle();
  const targetSitemap = sitemaps.find((s) => s.competitor_id === null);

  return (
    <div className="container py-12">
      <div className="mb-8 text-center">
        <Badge variant="violet" className="mb-3 gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Sample audit
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {audit.target_name} vs. its competitive set
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          This is a live example of a BenchBot report — exactly what you get after running an audit.
          Figures here are AI-estimated for illustration.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="gradient">
            <Link href="/signup">
              Run your own audit <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6">
        <ExecutiveSummarySection report={report} />
        <CompetitorMatrixSection scores={scores} />
        <HeuristicReviewSection report={report} />
        <SectionCard
          icon={Camera}
          title="Screenshots Library"
          description="Desktop and mobile captures across the competitive set."
        >
          <ScreenshotsLibrary screenshots={screenshots} />
        </SectionCard>
        <VisualSitemapSection sitemap={targetSitemap} />
        <IAComparisonSection report={report} />
        <ContentGapSection report={report} />
        <ConversionAuditSection report={report} />
        <AiVisibilitySection report={report} />
      </div>

      <div className="mx-auto mt-10 max-w-6xl">
        <div className="relative overflow-hidden rounded-2xl bg-brand-gradient px-8 py-12 text-center text-white">
          <h2 className="text-2xl font-bold tracking-tight">Get this for your site in minutes</h2>
          <p className="mx-auto mt-2 max-w-md text-white/85">
            Enter a URL, pick competitors, and BenchBot delivers the full report — free to start.
          </p>
          <Button asChild size="lg" className="mt-6 bg-white text-brand hover:bg-white/90">
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
