import { Accessibility, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { SectionCard } from "@/components/audit/section-card";
import { ScorePill } from "@/components/ui/score";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { a11yByCompany } from "@/lib/audit-insights";
import type { A11yCheck, AuditBundle } from "@/lib/types";

const STATUS_META: Record<A11yCheck["status"], { icon: typeof CheckCircle2; cls: string; label: string }> = {
  pass: { icon: CheckCircle2, cls: "text-good", label: "Pass" },
  warn: { icon: AlertTriangle, cls: "text-[#B5740B]", label: "Warn" },
  fail: { icon: XCircle, cls: "text-critical", label: "Fail" },
  info: { icon: Info, cls: "text-slate-400", label: "Info" },
};

export function AccessibilitySection({ bundle }: { bundle: AuditBundle }) {
  const rows = a11yByCompany(bundle);
  if (rows.length === 0) {
    return (
      <SectionCard icon={Accessibility} title="Accessibility Audit" id="accessibility">
        <p className="text-sm text-muted-foreground">
          No accessibility data was captured. Run an audit with real crawling enabled to inspect
          alt text, labels, contrast, landmarks and more.
        </p>
      </SectionCard>
    );
  }

  const target = rows.find((r) => r.isTarget) ?? rows[0];
  const failCount = target.report.checks.filter((c) => c.status === "fail").length;
  const warnCount = target.report.checks.filter((c) => c.status === "warn").length;

  return (
    <SectionCard
      icon={Accessibility}
      title="Accessibility Audit"
      description="DOM-level WCAG signals captured from each homepage — alt text, form labels, contrast, landmarks, headings, zoom and more."
      id="accessibility"
    >
      {/* Cross-company comparison */}
      <div className="mb-6 overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-3 font-medium text-muted-foreground">Company</th>
              <th className="px-2 py-2 text-center font-medium text-muted-foreground">A11y score</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Alt %</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Label %</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Contrast issues</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Landmarks</th>
              <th className="px-2 py-2 text-center font-medium text-muted-foreground">Lang</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.competitorId ?? "target"}
                className={cn("border-b border-border/60", r.isTarget && "bg-brand-50/40")}
              >
                <td className="py-2.5 pr-3">
                  <span className="font-medium text-ink">{r.name}</span>
                  {r.isTarget && <Badge variant="brand" className="ml-2 align-middle">Target</Badge>}
                  <div className="font-mono text-[11px] text-muted-foreground">{r.host}</div>
                </td>
                <td className="px-2 py-2.5 text-center"><ScorePill score={r.report.score} /></td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">{r.report.altCoverage}%</td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">{r.report.labelCoverage}%</td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">
                  {r.report.contrastIssues}
                  <span className="text-muted-foreground">/{r.report.contrastSampled}</span>
                </td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">{r.report.landmarksPresent}/4</td>
                <td className="px-2 py-2.5 text-center">
                  {r.report.hasLang ? (
                    <CheckCircle2 className="mx-auto h-4 w-4 text-good" />
                  ) : (
                    <XCircle className="mx-auto h-4 w-4 text-critical" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed checks for the target */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">
          {target.name} — detailed checks
        </h3>
        <div className="flex items-center gap-2 text-xs">
          {failCount > 0 && <Badge variant="critical">{failCount} failing</Badge>}
          {warnCount > 0 && <Badge variant="warn">{warnCount} warnings</Badge>}
          {failCount === 0 && warnCount === 0 && <Badge variant="good">No issues found</Badge>}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {target.report.checks.map((c) => {
          const meta = STATUS_META[c.status];
          const Icon = meta.icon;
          return (
            <div key={c.id} className="flex items-start gap-2.5 rounded-lg border border-border p-3">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.cls)} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Heuristic, DOM-based checks (contrast is sampled across up to 120 text nodes) — a fast first
        pass, not a substitute for a full manual WCAG audit.
      </p>
    </SectionCard>
  );
}
