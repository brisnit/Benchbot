import PptxGenJS from "pptxgenjs";
import { hostFromUrl, formatDate } from "@/lib/utils";
import type { AuditBundle, AuditScore } from "@/lib/types";
import type { AppComparisonRecord } from "@/lib/apps/record";

async function fetchImage(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "image/png";
    const b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}

// Builds a branded PowerPoint deck from an audit, styled to the BenchBot deck
// design system (pink accent, Georgia serif, navy/light editorial layouts).

// ── design tokens (reverse-engineered from the brand deck) ──
const PINK = "FF2D72";
const PINK_TINT = "FFE3EA";
const INK = "111111";
const GRAY = "6B6B6B";
const PANEL = "F5F5F7";
const LINE = "DDDDDD";
const NAVY = "1F2A57";
const WHITE = "FFFFFF";
const SERIF = "Georgia";
const SANS = "Arial";

const SHADOW = { type: "outer" as const, color: "BBBBBB", blur: 8, offset: 2, angle: 90, opacity: 0.3 };

// On-palette score colour: strong=navy, mid=gray, weak=pink (attention).
function scoreColor(n: number): string {
  if (n >= 75) return NAVY;
  if (n >= 50) return GRAY;
  return PINK;
}

export async function buildAuditPptx(bundle: AuditBundle): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pptx.author = "BenchBot";
  pptx.company = "BenchBot";
  pptx.title = `${bundle.audit.target_name} — Competitive Audit`;
  pptx.theme = { headFontFace: SERIF, bodyFontFace: SERIF };

  const audit = bundle.audit;
  const j = bundle.report?.report_json;
  const H = 7.5;

  // ── template helpers ──
  let pageNo = 0;
  function chrome(kicker: string, title: string) {
    pageNo++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    s.addText(kicker.toUpperCase(), { x: 0.7, y: 0.5, w: 11, fontSize: 11, bold: true, color: PINK, charSpacing: 3, fontFace: SANS });
    s.addText(title, { x: 0.66, y: 0.74, w: 11.8, fontSize: 30, bold: true, color: INK, fontFace: SERIF });
    s.addShape(pptx.ShapeType.rect, { x: 0.7, y: 1.55, w: 0.9, h: 0.05, fill: { color: PINK } });
    s.addShape(pptx.ShapeType.line, { x: 1.7, y: 1.575, w: 11.0, h: 0, line: { color: LINE, width: 1 } });
    s.addText(`BenchBot  ·  ${audit.target_name}`, { x: 0.7, y: 7.08, w: 9, fontSize: 9, color: GRAY, fontFace: SANS });
    s.addText(String(pageNo).padStart(2, "0"), { x: 12.3, y: 7.05, w: 0.5, fontSize: 11, color: PINK, bold: true, align: "right", fontFace: SERIF });
    return s;
  }
  const card = (s: PptxGenJS.Slide, x: number, y: number, w: number, h: number, fill = WHITE) =>
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.06, fill: { color: fill }, line: { color: LINE, width: 1 }, shadow: SHADOW });
  const chip = (s: PptxGenJS.Slide, x: number, y: number, label: string, color = PINK) =>
    s.addText(label.toUpperCase(), {
      x, y, w: 2.6, h: 0.34, fontSize: 11, bold: true, color: WHITE, align: "center", valign: "middle",
      fill: { color }, rectRadius: 0.04, shape: pptx.ShapeType.roundRect, charSpacing: 1, fontFace: SANS,
    });
  const bullets = (items: string[], opts: { x: number; y: number; w: number; h: number; size?: number; color?: string }) =>
    items.map((tx) => ({ text: tx, options: { bullet: { code: "2022", indent: 16 }, fontSize: opts.size ?? 12, color: opts.color ?? INK, paraSpaceAfter: 9, fontFace: SERIF } }));
  // Shape-based bars (render reliably in PowerPoint, Keynote AND Google Slides,
  // unlike native chart objects which can come up blank outside PowerPoint).
  const bar = (s: PptxGenJS.Slide, x: number, y: number, w: number, h: number, val: number, color: string, max = 100) => {
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.02, fill: { color: "EAEAEE" } });
    const fw = Math.max(0.06, (w * Math.max(0, Math.min(max, val))) / max);
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: fw, h, rectRadius: 0.02, fill: { color } });
  };

  // ── 1) TITLE (navy editorial) ──
  const t = pptx.addSlide();
  t.background = { color: NAVY };
  t.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.28, h: H, fill: { color: PINK } });
  t.addShape(pptx.ShapeType.ellipse, { x: 10.1, y: -2.0, w: 5.5, h: 5.5, fill: { color: PINK, transparency: 78 } });
  t.addText("BENCHBOT", { x: 0.8, y: 0.7, fontSize: 14, bold: true, color: PINK, charSpacing: 5, fontFace: SANS });
  t.addText(`Date: ${formatDate(audit.created_at)}`, { x: 0.82, y: 1.15, fontSize: 12, color: "AEB6CC", fontFace: SANS });
  t.addText(audit.target_name, { x: 0.78, y: 2.55, w: 8.6, fontSize: 50, bold: true, color: WHITE, fontFace: SERIF });
  t.addText("Competitive UX Audit", { x: 0.82, y: 3.75, fontSize: 24, italic: true, color: PINK_TINT, fontFace: SERIF });
  t.addText(hostFromUrl(audit.target_url), { x: 0.84, y: 4.55, fontSize: 14, color: "AEB6CC", fontFace: SANS });
  if (j) {
    t.addShape(pptx.ShapeType.ellipse, { x: 9.9, y: 2.3, w: 2.5, h: 2.5, fill: { color: NAVY }, line: { color: PINK, width: 3 } });
    t.addText(String(j.overall_score), { x: 9.9, y: 2.62, w: 2.5, h: 1.4, fontSize: 58, bold: true, color: WHITE, align: "center", fontFace: SERIF });
    t.addText("OVERALL", { x: 9.9, y: 3.92, w: 2.5, fontSize: 12, color: PINK_TINT, align: "center", charSpacing: 3, fontFace: SANS });
  }

  if (!j) return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

  const target = bundle.scores.find((s) => s.competitor_id === null) ?? bundle.scores[0];
  const comps = bundle.scores.filter((s) => s.competitor_id !== null);
  const dims = ["UX", "Mobile", "Nav", "Content", "Conv.", "AI Vis."];
  const keys: (keyof AuditScore)[] = ["ux_score", "mobile_score", "navigation_score", "content_score", "conversion_score", "ai_visibility_score"];
  const targetVals = keys.map((k) => target[k] as number);
  const compAvg = keys.map((k) => (comps.length ? Math.round(comps.reduce((a, c) => a + (c[k] as number), 0) / comps.length) : 0));
  const overallOf = (s: AuditScore) => Math.round(keys.reduce((a, k) => a + (s[k] as number), 0) / keys.length);

  // ── 2) CONTENTS (numbered agenda) ──
  const ag = chrome("Contents", "What's inside");
  const agendaItems = [
    "Executive summary", "Scores at a glance", "Competitor matrix",
    "Heuristic review", "Gaps & content", "Conversion & GEO", "Action plan",
  ];
  agendaItems.forEach((label, i) => {
    const col = Math.floor(i / 4);
    const row = i % 4;
    const x = 0.9 + col * 6.2;
    const y = 2.05 + row * 1.18;
    ag.addText(String(i + 1).padStart(2, "0"), { x, y, w: 1.1, h: 0.9, fontSize: 40, bold: true, color: PINK, fontFace: SERIF });
    ag.addText(label, { x: x + 1.2, y: y + 0.12, w: 4.6, h: 0.7, fontSize: 18, color: INK, valign: "middle", fontFace: SERIF });
    ag.addShape(pptx.ShapeType.line, { x: x + 1.2, y: y + 0.92, w: 4.5, h: 0, line: { color: LINE, width: 1 } });
  });

  // ── 3) EXECUTIVE SUMMARY ──
  const ex = chrome("01 — Executive Summary", `${audit.target_name} scores ${j.overall_score} / 100`);
  card(ex, 0.7, 1.85, 5.85, 4.85);
  chip(ex, 0.95, 2.05, "Top findings", PINK);
  ex.addText(bullets(j.top_findings.slice(0, 5), { x: 0.95, y: 2.55, w: 5.3, h: 4 }), { x: 0.95, y: 2.55, w: 5.35, h: 4, valign: "top" });
  card(ex, 6.8, 1.85, 5.85, 4.85);
  chip(ex, 7.05, 2.05, "Top opportunities", NAVY);
  ex.addText(bullets(j.top_opportunities.slice(0, 5), { x: 7.05, y: 2.55, w: 5.3, h: 4 }), { x: 7.05, y: 2.55, w: 5.35, h: 4, valign: "top" });

  // ── 4) SCORES AT A GLANCE (shape bars) ──
  const scz = chrome("02 — Benchmark", "Scores at a glance");
  // left: your dimensions vs competitor average
  card(scz, 0.7, 1.85, 5.95, 4.85, PANEL);
  scz.addText("You vs. competitor average", { x: 0.95, y: 2.05, w: 5.4, fontSize: 13, bold: true, color: INK, fontFace: SERIF });
  scz.addShape(pptx.ShapeType.rect, { x: 0.95, y: 2.5, w: 0.18, h: 0.14, fill: { color: PINK } });
  scz.addText(target.company_name, { x: 1.18, y: 2.42, w: 2.2, fontSize: 9, color: INK, fontFace: SANS });
  scz.addShape(pptx.ShapeType.rect, { x: 3.5, y: 2.5, w: 0.18, h: 0.14, fill: { color: GRAY } });
  scz.addText("Competitor avg", { x: 3.73, y: 2.42, w: 2.4, fontSize: 9, color: INK, fontFace: SANS });
  let dy = 2.95;
  dims.forEach((d, i) => {
    scz.addText(d, { x: 0.95, y: dy + 0.06, w: 1.05, h: 0.4, fontSize: 9, bold: true, color: INK, fontFace: SANS, valign: "middle" });
    const bx = 2.05, bw = 3.35;
    bar(scz, bx, dy, bw, 0.16, targetVals[i], PINK);
    scz.addText(String(targetVals[i]), { x: bx + bw + 0.08, y: dy - 0.04, w: 0.5, fontSize: 9, bold: true, color: PINK, fontFace: SANS });
    bar(scz, bx, dy + 0.22, bw, 0.16, compAvg[i], GRAY);
    scz.addText(String(compAvg[i]), { x: bx + bw + 0.08, y: dy + 0.18, w: 0.5, fontSize: 9, color: GRAY, fontFace: SANS });
    dy += 0.61;
  });
  // right: overall score by company
  card(scz, 6.85, 1.85, 5.8, 4.85, PANEL);
  scz.addText("Overall score by company", { x: 7.1, y: 2.05, w: 5.3, fontSize: 13, bold: true, color: INK, fontFace: SERIF });
  const companies = bundle.scores;
  const rowH = Math.min(0.66, 4.0 / companies.length);
  let oy = 2.65;
  companies.forEach((s) => {
    const ov = overallOf(s);
    const isT = s.competitor_id === null;
    scz.addText(s.company_name, { x: 7.1, y: oy, w: 2.0, h: rowH, fontSize: 10, bold: isT, color: INK, fontFace: SANS, valign: "middle" });
    const bx = 9.15, bw = 2.75;
    bar(scz, bx, oy + rowH / 2 - 0.11, bw, 0.22, ov, isT ? PINK : NAVY);
    scz.addText(String(ov), { x: bx + bw + 0.1, y: oy, w: 0.55, h: rowH, fontSize: 12, bold: true, color: isT ? PINK : NAVY, fontFace: SANS, valign: "middle" });
    oy += rowH;
  });

  // ── 5) COMPETITOR MATRIX ──
  const mx = chrome("03 — Competitor Matrix", "How the field compares");
  const header = ["Company", ...dims, "Overall"].map((x) => ({
    text: x, options: { bold: true, color: WHITE, fill: { color: INK }, align: "center" as const, valign: "middle" as const, fontSize: 12, fontFace: SANS },
  }));
  const rows = bundle.scores.map((sr, i) => {
    const fill = sr.competitor_id === null ? PINK_TINT : i % 2 ? WHITE : PANEL;
    return [
      { text: sr.company_name, options: { bold: sr.competitor_id === null, color: INK, valign: "middle" as const, fill: { color: fill }, fontSize: 12, fontFace: SERIF } },
      ...keys.map((k) => ({ text: String(sr[k]), options: { align: "center" as const, valign: "middle" as const, color: scoreColor(sr[k] as number), bold: true, fill: { color: fill }, fontFace: SANS } })),
      { text: String(overallOf(sr)), options: { align: "center" as const, valign: "middle" as const, color: WHITE, bold: true, fill: { color: scoreColor(overallOf(sr)) }, fontFace: SANS } },
    ];
  });
  mx.addTable([header, ...rows], { x: 0.7, y: 1.95, w: 11.95, colW: [3.05, 1.18, 1.18, 1.18, 1.18, 1.18, 1.27, 1.55], border: { type: "solid", color: WHITE, pt: 2 }, rowH: 0.5, valign: "middle", fontSize: 12 });

  // ── 4) HEURISTIC REVIEW — overview ──
  const hr = chrome("04 — UX Heuristics", "Heuristic review");
  card(hr, 0.7, 1.85, 6.4, 4.85, PANEL);
  let hy = 2.12;
  const hStep = 4.3 / j.heuristics.length;
  j.heuristics.forEach((h) => {
    hr.addText(h.label, { x: 0.95, y: hy, w: 1.95, h: hStep, fontSize: 9, color: INK, fontFace: SANS, valign: "middle" });
    const bx = 2.95, bw = 2.55;
    bar(hr, bx, hy + hStep / 2 - 0.09, bw, 0.18, h.score, scoreColor(h.score));
    hr.addText(String(h.score), { x: bx + bw + 0.1, y: hy, w: 0.5, h: hStep, fontSize: 10, bold: true, color: scoreColor(h.score), fontFace: SANS, valign: "middle" });
    hy += hStep;
  });
  card(hr, 7.35, 1.85, 5.3, 4.85);
  hr.addText("Priority fixes", { x: 7.6, y: 2.05, fontSize: 13, bold: true, color: PINK, fontFace: SERIF });
  const lowest = [...j.heuristics].sort((a, b) => a.score - b.score).slice(0, 4);
  hr.addText(
    lowest.map((h) => ({ text: `${h.label} (${h.score}) — ${h.recommendation}`, options: { bullet: { code: "2022", indent: 14 }, fontSize: 11, color: INK, paraSpaceAfter: 10, fontFace: SERIF } })),
    { x: 7.6, y: 2.5, w: 4.85, h: 4, valign: "top" },
  );

  // ── 4b) HEURISTIC REVIEW — full detail (every heuristic: score, evidence, fix) ──
  const heuHalf = Math.ceil(j.heuristics.length / 2);
  [j.heuristics.slice(0, heuHalf), j.heuristics.slice(heuHalf)].forEach((group, gi) => {
    if (!group.length) return;
    const hd = chrome("04 — UX Heuristics", `Detailed findings  (${gi + 1}/2)`);
    let yy = 1.92;
    group.forEach((h) => {
      card(hd, 0.7, yy, 11.95, 0.94);
      hd.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: yy + 0.18, w: 0.85, h: 0.58, rectRadius: 0.06, fill: { color: scoreColor(h.score) } });
      hd.addText(String(h.score), { x: 0.9, y: yy + 0.18, w: 0.85, h: 0.58, fontSize: 20, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: SERIF });
      hd.addText(h.label, { x: 1.95, y: yy + 0.07, w: 10.6, fontSize: 13, bold: true, color: INK, fontFace: SERIF });
      hd.addText([{ text: "Evidence   ", options: { bold: true, color: PINK, fontFace: SANS, fontSize: 8.5 } }, { text: h.evidence, options: { color: GRAY, fontFace: SANS, fontSize: 8.5 } }], { x: 1.95, y: yy + 0.39, w: 10.55, h: 0.24, valign: "top" });
      hd.addText([{ text: "Fix   ", options: { bold: true, color: NAVY, fontFace: SANS, fontSize: 8.5 } }, { text: h.recommendation, options: { color: INK, fontFace: SANS, fontSize: 8.5 } }], { x: 1.95, y: yy + 0.63, w: 10.55, h: 0.24, valign: "top" });
      yy += 1.02;
    });
  });

  // ── 5) GAPS & CONTENT ──
  const gp = chrome("05 — Gaps", "Where you're losing ground");
  card(gp, 0.7, 1.85, 5.85, 4.85);
  chip(gp, 0.95, 2.05, "Biggest gaps", PINK);
  gp.addText(bullets(j.biggest_gaps, { x: 0.95, y: 2.6, w: 5.3, h: 4 }), { x: 0.95, y: 2.6, w: 5.35, h: 4, valign: "top" });
  card(gp, 6.8, 1.85, 5.85, 4.85);
  chip(gp, 7.05, 2.05, "Content gaps", NAVY);
  gp.addText(
    j.content_gaps.map((g) => ({ text: `${g.topic} — ${g.opportunity}`, options: { bullet: { code: "2022", indent: 14 }, fontSize: 11.5, color: INK, paraSpaceAfter: 10, fontFace: SERIF } })),
    { x: 7.05, y: 2.6, w: 5.35, h: 4, valign: "top" },
  );

  // ── 9) CONVERSION & GEO ──
  const cv = chrome("06 — Conversion & GEO", "Convert more, get cited by AI");
  const conv = j.conversion_audit, ai = j.ai_visibility;
  card(cv, 0.7, 1.85, 5.85, 4.85);
  chip(cv, 0.95, 2.05, "Conversion", PINK);
  cv.addText(bullets([conv.cta_clarity, conv.form_length, conv.contact_flow, conv.trust_signals, conv.lead_magnets], { x: 0.95, y: 2.6, w: 5.3, h: 4, size: 11.5 }), { x: 0.95, y: 2.6, w: 5.35, h: 4, valign: "top" });
  card(cv, 6.8, 1.85, 5.85, 4.85);
  chip(cv, 7.05, 2.05, "AI / GEO visibility", NAVY);
  cv.addText(bullets([ai.schema_markup, ai.metadata, ai.faq_schema, ai.crawlability, ai.llm_clarity], { x: 7.05, y: 2.6, w: 5.3, h: 4, size: 11.5 }), { x: 7.05, y: 2.6, w: 5.35, h: 4, valign: "top" });

  // ── 10) ACTION PLAN (numbered editorial) ──
  const ns = chrome("07 — Action Plan", "Recommended next steps");
  j.next_steps.slice(0, 5).forEach((step, i) => {
    const y = 1.95 + i * 0.96;
    ns.addText(String(i + 1).padStart(2, "0"), { x: 0.7, y, w: 1.0, h: 0.8, fontSize: 34, bold: true, color: i === 0 ? PINK : GRAY, fontFace: SERIF, valign: "middle" });
    ns.addShape(pptx.ShapeType.line, { x: 1.75, y: y + 0.05, w: 0, h: 0.7, line: { color: LINE, width: 1 } });
    ns.addText(step, { x: 2.0, y, w: 10.6, h: 0.8, fontSize: 15, color: INK, valign: "middle", fontFace: SERIF });
  });

  // ── 11) CLOSING (pink) ──
  const cl = pptx.addSlide();
  cl.background = { color: PINK };
  cl.addShape(pptx.ShapeType.ellipse, { x: -1.8, y: 4.4, w: 6, h: 6, fill: { color: WHITE, transparency: 88 } });
  cl.addText("BENCHBOT", { x: 0.8, y: 0.7, fontSize: 14, bold: true, color: WHITE, charSpacing: 5, fontFace: SANS });
  cl.addText("Benchmark anything.", { x: 0.76, y: 2.8, w: 11.5, fontSize: 46, bold: true, color: WHITE, fontFace: SERIF });
  cl.addText("Days of competitive research, distilled into a client-ready report.", { x: 0.8, y: 4.0, fontSize: 17, italic: true, color: "FFE3EA", fontFace: SERIF });
  cl.addText("Generated by BenchBot — figures in this report are AI-estimated.", { x: 0.82, y: 6.7, fontSize: 11, color: "FFD0DD", fontFace: SANS });

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

// ── App Compare deck (same design system as the audit deck) ──
export async function buildAppComparisonPptx(rec: AppComparisonRecord): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "BenchBot";
  pptx.company = "BenchBot";
  pptx.title = `${rec.target_name} — App Benchmark`;
  pptx.theme = { headFontFace: SERIF, bodyFontFace: SERIF };

  const target = rec.apps.find((a) => a.id === rec.target_id) ?? rec.apps[0];
  const apps = rec.apps;
  const j = rec.comparison;
  const rc = (r: number) => scoreColor(r * 20); // rating 0-5 → palette

  let pageNo = 0;
  function chrome(kicker: string, title: string) {
    pageNo++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    s.addText(kicker.toUpperCase(), { x: 0.7, y: 0.5, w: 11, fontSize: 11, bold: true, color: PINK, charSpacing: 3, fontFace: SANS });
    s.addText(title, { x: 0.66, y: 0.74, w: 11.8, fontSize: 30, bold: true, color: INK, fontFace: SERIF });
    s.addShape(pptx.ShapeType.rect, { x: 0.7, y: 1.55, w: 0.9, h: 0.05, fill: { color: PINK } });
    s.addShape(pptx.ShapeType.line, { x: 1.7, y: 1.575, w: 11.0, h: 0, line: { color: LINE, width: 1 } });
    s.addText(`BenchBot  ·  ${rec.target_name}`, { x: 0.7, y: 7.08, w: 9, fontSize: 9, color: GRAY, fontFace: SANS });
    s.addText(String(pageNo).padStart(2, "0"), { x: 12.3, y: 7.05, w: 0.5, fontSize: 11, color: PINK, bold: true, align: "right", fontFace: SERIF });
    return s;
  }
  const card = (s: PptxGenJS.Slide, x: number, y: number, w: number, h: number, fill = WHITE) =>
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.06, fill: { color: fill }, line: { color: LINE, width: 1 }, shadow: SHADOW });
  const chip = (s: PptxGenJS.Slide, x: number, y: number, label: string, color = PINK) =>
    s.addText(label.toUpperCase(), { x, y, w: 2.6, h: 0.34, fontSize: 11, bold: true, color: WHITE, align: "center", valign: "middle", fill: { color }, rectRadius: 0.04, shape: pptx.ShapeType.roundRect, charSpacing: 1, fontFace: SANS });
  const bar = (s: PptxGenJS.Slide, x: number, y: number, w: number, h: number, val: number, max: number, color: string) => {
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.02, fill: { color: PANEL } });
    const fw = Math.max(0.05, (w * Math.max(0, Math.min(max, val))) / max);
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: fw, h, rectRadius: 0.02, fill: { color } });
  };

  // 1) TITLE
  const t = pptx.addSlide();
  t.background = { color: NAVY };
  t.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: PINK } });
  t.addText("BENCHBOT · APP STORE BENCHMARK", { x: 0.7, y: 0.7, fontSize: 13, bold: true, color: "FFB3C8", charSpacing: 3, fontFace: SANS });
  t.addText(rec.target_name, { x: 0.66, y: 2.5, w: 8.4, fontSize: 46, bold: true, color: WHITE, fontFace: SERIF });
  t.addText(`${apps.length - 1} competitors · ${rec.country.toUpperCase()} App Store`, { x: 0.72, y: 3.9, fontSize: 16, color: "C9D2F0", fontFace: SANS });
  const icon = await fetchImage(target.icon);
  if (icon) t.addImage({ data: icon, x: 10.05, y: 2.15, w: 1.9, h: 1.9, rounding: true });
  t.addText(`${target.rating || "—"}★`, { x: 9.7, y: 4.25, w: 2.6, fontSize: 30, bold: true, color: WHITE, align: "center", fontFace: SERIF });
  t.addText(`${target.ratingCount.toLocaleString()} ratings`, { x: 9.7, y: 4.95, w: 2.6, fontSize: 11, color: "C9D2F0", align: "center", fontFace: SANS });

  // 2) OVERVIEW TABLE
  const ov = chrome("01 — Apps", "The competitive set");
  const head = ["App", "Rating", "Ratings", "Category", "Price", "Size"].map((x) => ({ text: x, options: { bold: true, color: WHITE, fill: { color: INK }, align: "center" as const, valign: "middle" as const, fontSize: 12, fontFace: SANS } }));
  const rows = apps.map((a, i) => {
    const fill = a.id === target.id ? PINK_TINT : i % 2 ? WHITE : PANEL;
    return [
      { text: a.name, options: { bold: a.id === target.id, color: INK, valign: "middle" as const, fill: { color: fill }, fontSize: 12, fontFace: SERIF } },
      { text: String(a.rating || "—"), options: { align: "center" as const, valign: "middle" as const, color: rc(a.rating), bold: true, fill: { color: fill }, fontFace: SANS } },
      { text: a.ratingCount.toLocaleString(), options: { align: "center" as const, valign: "middle" as const, color: INK, fill: { color: fill }, fontSize: 11, fontFace: SANS } },
      { text: a.category, options: { align: "center" as const, valign: "middle" as const, color: GRAY, fill: { color: fill }, fontSize: 11, fontFace: SANS } },
      { text: a.price, options: { align: "center" as const, valign: "middle" as const, color: INK, fill: { color: fill }, fontSize: 11, fontFace: SANS } },
      { text: a.sizeMB ? `${a.sizeMB} MB` : "—", options: { align: "center" as const, valign: "middle" as const, color: GRAY, fill: { color: fill }, fontSize: 11, fontFace: SANS } },
    ];
  });
  ov.addTable([head, ...rows], { x: 0.7, y: 1.95, w: 11.95, colW: [4.0, 1.5, 1.95, 2.3, 1.1, 1.1], border: { type: "solid", color: WHITE, pt: 2 }, rowH: 0.5, valign: "middle" });

  // 3) RATINGS & REVIEWS
  const rr = chrome("02 — Ratings", "Ratings & review volume");
  const maxRev = Math.max(...apps.map((a) => a.ratingCount), 1);
  let ry = 2.1;
  const step = Math.min(0.8, 4.4 / apps.length);
  apps.forEach((a) => {
    rr.addText(a.name, { x: 0.7, y: ry, w: 3.0, h: step, fontSize: 12, bold: a.id === target.id, color: INK, fontFace: SERIF, valign: "middle" });
    bar(rr, 3.9, ry + step / 2 - 0.11, 6.2, 0.22, a.ratingCount, maxRev, a.id === target.id ? PINK : NAVY);
    rr.addText(`${a.rating || "—"}★  ·  ${a.ratingCount.toLocaleString()}`, { x: 10.25, y: ry, w: 2.4, h: step, fontSize: 11, color: GRAY, fontFace: SANS, valign: "middle" });
    ry += step;
  });

  // 4) INSIGHTS
  const ins = chrome("03 — Insights", "Competitive insights");
  card(ins, 0.7, 1.85, 11.95, 1.7, PANEL);
  ins.addText(j.summary, { x: 0.95, y: 2.05, w: 11.5, h: 1.35, fontSize: 13, color: INK, fontFace: SERIF, valign: "top" });
  ins.addText("Recommendations".toUpperCase(), { x: 0.7, y: 3.75, fontSize: 11, bold: true, color: PINK, charSpacing: 2, fontFace: SANS });
  ins.addText(
    j.recommendations.slice(0, 6).map((r) => ({ text: r, options: { bullet: { code: "2022", indent: 14 }, fontSize: 12, color: INK, paraSpaceAfter: 8, fontFace: SERIF } })),
    { x: 0.7, y: 4.1, w: 11.95, h: 2.7, valign: "top" },
  );

  // 5) STRENGTHS & WEAKNESSES (up to 4 apps, 2x2)
  const sw = chrome("04 — SWOT", "Strengths & weaknesses");
  apps.slice(0, 4).forEach((a, i) => {
    const x = 0.7 + (i % 2) * 6.05;
    const y = 1.9 + Math.floor(i / 2) * 2.45;
    card(sw, x, y, 5.9, 2.25);
    sw.addText(a.name, { x: x + 0.25, y: y + 0.15, w: 5.4, fontSize: 13, bold: true, color: INK, fontFace: SERIF });
    const insight = j.insights.find((z) => z.appId === a.id);
    const lines = [
      ...(insight?.strengths ?? []).slice(0, 2).map((s) => ({ text: s, options: { bullet: { code: "2713", indent: 14 }, color: NAVY, fontSize: 10, paraSpaceAfter: 5, fontFace: SANS } })),
      ...(insight?.weaknesses ?? []).slice(0, 2).map((s) => ({ text: s, options: { bullet: { code: "2717", indent: 14 }, color: PINK, fontSize: 10, paraSpaceAfter: 5, fontFace: SANS } })),
    ];
    if (lines.length) sw.addText(lines, { x: x + 0.25, y: y + 0.55, w: 5.4, h: 1.6, valign: "top" });
  });

  // 6) SCREENSHOTS (target)
  const shots = (target.screenshots.length ? target.screenshots : target.ipadScreenshots).slice(0, 5);
  if (shots.length) {
    const ss = chrome("05 — Store listing", `${target.name} screenshots`);
    const imgs = await Promise.all(shots.map((s) => fetchImage(s)));
    const isPhone = target.screenshots.length > 0;
    const h = 4.6;
    const w = isPhone ? 2.12 : 6.0;
    const gap = 0.25;
    let x = 0.7;
    imgs.forEach((data) => {
      if (data && x + w <= 13.0) {
        ss.addImage({ data, x, y: 2.0, w, h, sizing: { type: "contain", w, h } });
        x += w + gap;
      }
    });
  }

  // 7) CLOSING
  const cl = pptx.addSlide();
  cl.background = { color: NAVY };
  cl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: PINK } });
  cl.addText("BENCHBOT", { x: 0.7, y: 0.7, fontSize: 13, bold: true, color: "FFB3C8", charSpacing: 4, fontFace: SANS });
  cl.addText("Benchmark anything.", { x: 0.66, y: 3.0, w: 11, fontSize: 42, bold: true, color: WHITE, fontFace: SERIF });
  cl.addText("Generated by BenchBot — App Store data via Apple; insights are AI-estimated.", { x: 0.72, y: 4.1, fontSize: 13, color: "C9D2F0", fontFace: SANS });

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
