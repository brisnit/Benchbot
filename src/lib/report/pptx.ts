import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import { hostFromUrl, formatDate } from "@/lib/utils";
import { readScreenshotFile } from "@/lib/crawler/crawl";
import { env } from "@/lib/env";
import type { AuditBundle, AuditScore, Screenshot } from "@/lib/types";

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

async function loadImageDataUri(storagePath: string): Promise<string | null> {
  try {
    if (storagePath.startsWith("/api/screenshot-file/")) {
      const name = decodeURIComponent(storagePath.split("/").pop() || "");
      const buf = readScreenshotFile(name);
      return buf ? `data:image/png;base64,${buf.toString("base64")}` : null;
    }
    if (storagePath.startsWith("/example/")) {
      const file = path.join(process.cwd(), "public", storagePath.replace(/^\//, ""));
      return fs.existsSync(file) ? `data:image/png;base64,${fs.readFileSync(file).toString("base64")}` : null;
    }
    const url = storagePath.startsWith("http") ? storagePath : `${env.appUrl}${storagePath}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/png";
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
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
    "Executive summary", "Scores at a glance", "Competitor matrix", "Screenshots",
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

  // ── 4) SCORES AT A GLANCE (charts) ──
  const scz = chrome("02 — Benchmark", "Scores at a glance");
  card(scz, 0.7, 1.85, 5.95, 4.85, PANEL);
  scz.addText("You vs. competitor average", { x: 0.95, y: 2.05, fontSize: 13, bold: true, color: INK, fontFace: SERIF });
  scz.addChart(
    pptx.ChartType.radar,
    [
      { name: target.company_name, labels: dims, values: targetVals },
      { name: "Competitor avg", labels: dims, values: compAvg },
    ],
    {
      x: 0.8, y: 2.5, w: 5.75, h: 4.0, radarStyle: "standard", chartColors: [PINK, GRAY], chartColorsOpacity: 40,
      showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: SANS,
      catAxisLabelColor: GRAY, catAxisLabelFontFace: SANS, catAxisLabelFontSize: 10, valAxisHidden: true, showValue: false,
    },
  );
  card(scz, 6.85, 1.85, 5.8, 4.85, PANEL);
  scz.addText("Overall score by company", { x: 7.1, y: 2.05, fontSize: 13, bold: true, color: INK, fontFace: SERIF });
  scz.addChart(
    pptx.ChartType.bar,
    [{ name: "Overall", labels: bundle.scores.map((s) => s.company_name), values: bundle.scores.map(overallOf) }],
    {
      x: 6.95, y: 2.5, w: 5.6, h: 4.0, barDir: "bar", chartColors: [PINK, NAVY, "FF7AA5", "39477A", "9AA0AC", "C04A78", "5B6BA0"],
      showValue: true, dataLabelColor: WHITE, dataLabelFontFace: SANS, dataLabelFontSize: 10, dataLabelFontBold: true,
      valAxisHidden: true, valAxisMaxVal: 100, valAxisMinVal: 0, catAxisLabelColor: INK, catAxisLabelFontFace: SANS, catAxisLabelFontSize: 11, showLegend: false, barGapWidthPct: 40,
    },
  );

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

  // ── 6) SCREENSHOTS ──
  const shotCompanies = bundle.scores
    .map((s): { name: string; shot: Screenshot } | null => {
      const shots = bundle.screenshots.filter((x) => x.competitor_id === s.competitor_id);
      const shot = shots.find((x) => x.page_type === "homepage" && x.device_type === "desktop") || shots.find((x) => x.page_type === "homepage") || shots[0];
      return shot ? { name: s.company_name, shot } : null;
    })
    .filter((x): x is { name: string; shot: Screenshot } => x !== null)
    .slice(0, 6);

  if (shotCompanies.length) {
    const ss = chrome("04 — Screenshots", "Homepages, side by side");
    const imgs = await Promise.all(shotCompanies.map((c) => loadImageDataUri(c.shot.storage_path)));
    const cols = 3, cw = 3.85, ch = 2.1, gx = 0.7, gy = 1.95;
    const padX = (11.95 - cols * cw) / (cols - 1);
    shotCompanies.forEach((c, i) => {
      const x = gx + (i % cols) * (cw + padX);
      const y = gy + Math.floor(i / cols) * (ch + 0.56);
      card(ss, x, y, cw, ch + 0.42, PANEL);
      const data = imgs[i];
      if (data) ss.addImage({ data, x: x + 0.12, y: y + 0.12, w: cw - 0.24, h: ch - 0.1, sizing: { type: "cover", w: cw - 0.24, h: ch - 0.1 } });
      else ss.addText("preview unavailable", { x, y: y + ch / 2 - 0.2, w: cw, fontSize: 10, color: GRAY, align: "center", fontFace: SANS });
      ss.addText(c.name, { x: x + 0.14, y: y + ch + 0.05, w: cw - 0.28, fontSize: 11, bold: true, color: INK, fontFace: SERIF });
    });
  }

  // ── 7) HEURISTIC REVIEW ──
  const hr = chrome("05 — UX Heuristics", "Heuristic review");
  card(hr, 0.7, 1.85, 6.4, 4.85, PANEL);
  hr.addChart(
    pptx.ChartType.bar,
    [{ name: "Score", labels: j.heuristics.map((h) => h.label), values: j.heuristics.map((h) => h.score) }],
    {
      x: 0.8, y: 2.05, w: 6.2, h: 4.5, barDir: "bar", chartColors: [PINK], showValue: true, dataLabelColor: WHITE, dataLabelFontFace: SANS, dataLabelFontBold: true, dataLabelFontSize: 9,
      valAxisHidden: true, valAxisMaxVal: 100, valAxisMinVal: 0, catAxisLabelColor: INK, catAxisLabelFontFace: SANS, catAxisLabelFontSize: 9, showLegend: false, barGapWidthPct: 30,
    },
  );
  card(hr, 7.35, 1.85, 5.3, 4.85);
  hr.addText("Priority fixes", { x: 7.6, y: 2.05, fontSize: 13, bold: true, color: PINK, fontFace: SERIF });
  const lowest = [...j.heuristics].sort((a, b) => a.score - b.score).slice(0, 4);
  hr.addText(
    lowest.map((h) => ({ text: `${h.label} (${h.score}) — ${h.recommendation}`, options: { bullet: { code: "2022", indent: 14 }, fontSize: 11, color: INK, paraSpaceAfter: 10, fontFace: SERIF } })),
    { x: 7.6, y: 2.5, w: 4.85, h: 4, valign: "top" },
  );

  // ── 8) GAPS & CONTENT ──
  const gp = chrome("06 — Gaps", "Where you're losing ground");
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
  const cv = chrome("07 — Conversion & GEO", "Convert more, get cited by AI");
  const conv = j.conversion_audit, ai = j.ai_visibility;
  card(cv, 0.7, 1.85, 5.85, 4.85);
  chip(cv, 0.95, 2.05, "Conversion", PINK);
  cv.addText(bullets([conv.cta_clarity, conv.form_length, conv.contact_flow, conv.trust_signals, conv.lead_magnets], { x: 0.95, y: 2.6, w: 5.3, h: 4, size: 11.5 }), { x: 0.95, y: 2.6, w: 5.35, h: 4, valign: "top" });
  card(cv, 6.8, 1.85, 5.85, 4.85);
  chip(cv, 7.05, 2.05, "AI / GEO visibility", NAVY);
  cv.addText(bullets([ai.schema_markup, ai.metadata, ai.faq_schema, ai.crawlability, ai.llm_clarity], { x: 7.05, y: 2.6, w: 5.3, h: 4, size: 11.5 }), { x: 7.05, y: 2.6, w: 5.35, h: 4, valign: "top" });

  // ── 10) ACTION PLAN (numbered editorial) ──
  const ns = chrome("08 — Action Plan", "Recommended next steps");
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
