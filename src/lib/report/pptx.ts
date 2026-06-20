import PptxGenJS from "pptxgenjs";
import { hostFromUrl } from "@/lib/utils";
import type { AuditBundle } from "@/lib/types";

// Builds a branded, client-ready PowerPoint deck from an audit bundle.
// Returns a Buffer (the .pptx bytes).

const BRAND = "3552E6";
const VIOLET = "7C5CFC";
const INK = "0B1117";
const SLATE = "647488";
const GOOD = "16C098";
const WARN = "F5A524";
const CRIT = "F31268";
const LINE = "E4E7EF";
const BG = "F6F7FB";
const WHITE = "FFFFFF";

function scoreColor(n: number): string {
  if (n >= 75) return GOOD;
  if (n >= 50) return WARN;
  return CRIT;
}

export async function buildAuditPptx(bundle: AuditBundle): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pptx.author = "BenchBot";
  pptx.company = "BenchBot";
  pptx.title = `${bundle.audit.target_name} — Competitive Audit`;

  const audit = bundle.audit;
  const j = bundle.report?.report_json;

  // ── Title slide ──
  const title = pptx.addSlide();
  title.background = { color: INK };
  title.addText("BenchBot", { x: 0.6, y: 0.5, fontSize: 16, bold: true, color: VIOLET });
  title.addText(audit.target_name, { x: 0.6, y: 2.3, w: 9, fontSize: 46, bold: true, color: WHITE });
  title.addText("Competitive Audit", { x: 0.6, y: 3.45, fontSize: 24, color: "CBD5E1" });
  title.addText(hostFromUrl(audit.target_url), { x: 0.62, y: 4.25, fontSize: 14, color: SLATE, fontFace: "Courier New" });
  if (j) {
    title.addText(String(j.overall_score), {
      x: 9.7, y: 2.0, w: 3, h: 2, fontSize: 96, bold: true, color: scoreColor(j.overall_score), align: "center",
    });
    title.addText("OVERALL SCORE", { x: 9.7, y: 4.05, w: 3, fontSize: 12, color: SLATE, align: "center", charSpacing: 2 });
  }

  if (!j) {
    const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    return buf;
  }

  // helper: standard content slide with header
  const contentSlide = (heading: string, sub?: string) => {
    const s = pptx.addSlide();
    s.background = { color: BG };
    s.addText(heading, { x: 0.6, y: 0.4, fontSize: 26, bold: true, color: INK });
    if (sub) s.addText(sub, { x: 0.6, y: 1.02, w: 12.1, fontSize: 13, color: SLATE });
    s.addShape(pptx.ShapeType.line, { x: 0.6, y: 1.5, w: 12.13, h: 0, line: { color: LINE, width: 1 } });
    s.addText("BenchBot", { x: 11.9, y: 7.0, fontSize: 9, color: SLATE });
    return s;
  };

  const bulletList = (items: string[], opts: { x: number; y: number; w: number; color?: string }) =>
    items.map((t) => ({
      text: t,
      options: { bullet: { code: "2022" }, color: INK, fontSize: 13, paraSpaceAfter: 8, indentLevel: 0 },
    }));

  // ── Executive summary (findings vs opportunities) ──
  const exec = contentSlide("Executive Summary", `${audit.target_name} scored ${j.overall_score}/100 against the competitive set.`);
  exec.addText("Top findings", { x: 0.7, y: 1.75, fontSize: 14, bold: true, color: CRIT });
  exec.addText(
    j.top_findings.slice(0, 5).map((t) => ({ text: t, options: { bullet: { code: "2022" }, fontSize: 12, color: INK, paraSpaceAfter: 7 } })),
    { x: 0.7, y: 2.15, w: 5.7, h: 4.6, valign: "top" },
  );
  exec.addText("Top opportunities", { x: 6.9, y: 1.75, fontSize: 14, bold: true, color: GOOD });
  exec.addText(
    j.top_opportunities.slice(0, 5).map((t) => ({ text: t, options: { bullet: { code: "2022" }, fontSize: 12, color: INK, paraSpaceAfter: 7 } })),
    { x: 6.9, y: 2.15, w: 5.8, h: 4.6, valign: "top" },
  );

  // ── Competitor matrix ──
  const matrix = contentSlide("Competitor Matrix");
  const headerRow = ["Company", "UX", "Mobile", "Nav", "Content", "Conv.", "AI Vis."].map((t) => ({
    text: t,
    options: { bold: true, color: WHITE, fill: { color: BRAND }, align: "center" as const, valign: "middle" as const },
  }));
  const bodyRows = bundle.scores.map((sr) => [
    { text: sr.company_name, options: { bold: sr.competitor_id === null, color: INK, valign: "middle" as const } },
    ...[sr.ux_score, sr.mobile_score, sr.navigation_score, sr.content_score, sr.conversion_score, sr.ai_visibility_score].map((v) => ({
      text: String(v),
      options: { align: "center" as const, valign: "middle" as const, color: scoreColor(v), bold: true },
    })),
  ]);
  matrix.addTable([headerRow, ...bodyRows], {
    x: 0.6, y: 1.8, w: 12.13, colW: [3.13, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
    border: { type: "solid", color: LINE, pt: 1 }, fontSize: 13, rowH: 0.45, valign: "middle",
  });

  // ── Heuristic review ──
  const heur = contentSlide("Heuristic Review");
  const hHeader = ["Heuristic", "Score", "Recommendation"].map((t) => ({
    text: t, options: { bold: true, color: WHITE, fill: { color: VIOLET }, valign: "middle" as const },
  }));
  const hRows = j.heuristics.slice(0, 10).map((h) => [
    { text: h.label, options: { color: INK, bold: true, valign: "middle" as const, fontSize: 11 } },
    { text: String(h.score), options: { align: "center" as const, color: scoreColor(h.score), bold: true, valign: "middle" as const } },
    { text: h.recommendation, options: { color: SLATE, fontSize: 10, valign: "middle" as const } },
  ]);
  heur.addTable([hHeader, ...hRows], {
    x: 0.6, y: 1.8, w: 12.13, colW: [3, 1.2, 7.93],
    border: { type: "solid", color: LINE, pt: 1 }, fontSize: 11, rowH: 0.34, valign: "middle",
  });

  // ── Biggest gaps ──
  const gaps = contentSlide("Biggest Gaps");
  gaps.addText(bulletList(j.biggest_gaps, { x: 0.7, y: 1.9, w: 11.9 }), { x: 0.7, y: 1.9, w: 11.9, h: 5, valign: "top" });

  // ── Content gaps ──
  const cg = contentSlide("Content Gap Analysis");
  cg.addText(
    j.content_gaps.map((g) => ({
      text: `${g.topic} — ${g.opportunity}`,
      options: { bullet: { code: "2022" }, fontSize: 13, color: INK, paraSpaceAfter: 9 },
    })),
    { x: 0.7, y: 1.9, w: 11.9, h: 5, valign: "top" },
  );

  // ── Conversion & AI visibility ──
  const ca = contentSlide("Conversion & AI Visibility");
  const conv = j.conversion_audit;
  const ai = j.ai_visibility;
  ca.addText("Conversion", { x: 0.7, y: 1.72, fontSize: 14, bold: true, color: BRAND });
  ca.addText(
    [conv.cta_clarity, conv.form_length, conv.contact_flow, conv.trust_signals, conv.lead_magnets].map((t) => ({
      text: t, options: { bullet: { code: "2022" }, fontSize: 11, color: INK, paraSpaceAfter: 6 },
    })),
    { x: 0.7, y: 2.12, w: 5.7, h: 4.6, valign: "top" },
  );
  ca.addText("AI / GEO visibility", { x: 6.9, y: 1.72, fontSize: 14, bold: true, color: VIOLET });
  ca.addText(
    [ai.schema_markup, ai.metadata, ai.faq_schema, ai.crawlability, ai.llm_clarity].map((t) => ({
      text: t, options: { bullet: { code: "2022" }, fontSize: 11, color: INK, paraSpaceAfter: 6 },
    })),
    { x: 6.9, y: 2.12, w: 5.8, h: 4.6, valign: "top" },
  );

  // ── Next steps ──
  const ns = contentSlide("Recommended Next Steps");
  ns.addText(
    j.next_steps.map((t, i) => ({ text: `${i + 1}.   ${t}`, options: { fontSize: 16, color: INK, paraSpaceAfter: 13 } })),
    { x: 0.7, y: 1.9, w: 11.9, h: 5, valign: "top" },
  );

  // ── Closing ──
  const close = pptx.addSlide();
  close.background = { color: INK };
  close.addText("Benchmark anything.", { x: 0.6, y: 2.9, fontSize: 40, bold: true, color: WHITE });
  close.addText("Generated by BenchBot — figures in this report are AI-estimated.", { x: 0.62, y: 3.9, fontSize: 13, color: SLATE });

  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return buf;
}
