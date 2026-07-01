"use client";

import * as React from "react";
import { FileText, FileType, Presentation, Code2, Eye, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/audit/copy-button";
import { Markdown } from "@/components/audit/markdown";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function ReportBuilder({
  executiveSummary,
  fullMarkdown,
  targetName,
  auditId,
}: {
  executiveSummary: string;
  fullMarkdown: string;
  targetName: string;
  auditId: string;
}) {
  const { toast } = useToast();
  const [view, setView] = React.useState<"formatted" | "markdown">("formatted");
  const [exportingPptx, setExportingPptx] = React.useState(false);

  function exportPdf() {
    toast({
      title: "Preparing PDF…",
      description: "Use your browser's “Save as PDF” in the print dialog.",
    });
    setTimeout(() => window.print(), 400);
  }

  async function exportPptx() {
    setExportingPptx(true);
    toast({ title: "Building your PowerPoint…", description: "This takes a moment." });
    try {
      const res = await fetch(`/api/audits/${auditId}/pptx`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${targetName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-benchbot-audit.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "PowerPoint downloaded", variant: "success" });
    } catch {
      toast({ title: "Couldn't export PowerPoint", description: "Please try again.", variant: "error" });
    } finally {
      setExportingPptx(false);
    }
  }

  return (
    <div>
      {/* Prominent export CTAs — hidden when printing */}
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-brand/20 bg-brand-50/50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm">
            <Download className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-base font-bold tracking-tight text-ink">Export &amp; share this report</p>
            <p className="text-sm text-muted-foreground">Client-ready PDF and PowerPoint, generated from your audit.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="gradient" size="lg" onClick={exportPdf}>
            <FileType className="h-4 w-4" /> Export PDF
          </Button>
          <Button variant="gradient" size="lg" onClick={exportPptx} disabled={exportingPptx}>
            {exportingPptx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
            Export PowerPoint
          </Button>
          <CopyButton value={executiveSummary} label="Copy report" toastLabel="Report copied" />
        </div>
      </div>

      {/* View toggle */}
      <div className="mb-4 flex justify-end print:hidden">
        <div className="flex rounded-lg border border-border p-0.5">
          <ToggleBtn active={view === "formatted"} onClick={() => setView("formatted")}>
            <Eye className="h-3.5 w-3.5" /> Formatted
          </ToggleBtn>
          <ToggleBtn active={view === "markdown"} onClick={() => setView("markdown")}>
            <Code2 className="h-3.5 w-3.5" /> Markdown
          </ToggleBtn>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white shadow-sm">
        {/* Report letterhead */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-6 py-4 print:border-b-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand" />
            <span className="font-display font-semibold">{targetName} — Competitive Audit</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">BenchBot</span>
        </div>

        <div className="px-6 py-6 md:px-10 md:py-8">
          {view === "formatted" ? (
            <Markdown content={fullMarkdown} />
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-ink p-4 font-mono text-xs leading-relaxed text-slate-200 scrollbar-thin">
              {fullMarkdown}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-brand text-white" : "text-muted-foreground hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
