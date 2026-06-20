import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import { hostFromUrl } from "@/lib/utils";
import { readScreenshotFile } from "@/lib/crawler/crawl";
import { env } from "@/lib/env";
import type { AuditBundle, AuditScore, Screenshot } from "@/lib/types";

// Builds a branded, client-ready PowerPoint deck (with charts + screenshots)
// from an audit bundle. Returns the .pptx bytes as a Buffer.

const BRAND = "3552E6";
const BRAND_DK = "273FC2";
const VIOLET = "7C5CFC";
const INK = "0B1117";
const INK_2 = "1B2433";
const SLATE = "647488";
const SLATE_LT = "94A3B8";
const GOOD = "16C098";
const WARN = "F5A524";
const CRIT = "F31268";
const LINE = "E4E7EF";
const BG = "F6F7FB";
const WHITE = "FFFFFF";

const SHADOW = { type: "outer" as const, color: "8A94A6", blur: 9, offset: 2, angle: 90, opacity: 0.22 };

function scoreColor(n: number): string {
  if (n >= 75) return GOOD;
  if (n >= 50) return WARN;
  return CRIT;
}

// ── server-side image loader (disk first, then HTTP fallback) ──
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

  const audit = bundle.audit;
  const j = bundle.report?.report_json;
  const H = 7.5;

  // ── shared template helpers ──
  let pageNo = 0;
  function chrome(kicker: string, title: string, accent = BRAND) {
    pageNo++;
    const s = pptx.addSlide();
    s.background = { color: BG };
    // left accent rail
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.16, h: H, fill: { color: accent } });
    // kicker + title
    s.addText(kicker.toUpperCase(), { x: 0.6, y: 0.42, w: 11, fontSize: 11, bold: true, color: accent, charSpacing: 3 });
    s.addText(title, { x: 0.58, y: 0.66, w: 11.5, fontSize: 26, bold: true, color: INK });
    // rule
    s.addShape(pptx.ShapeType.line, { x: 0.6, y: 1.42, w: 12.13, h: 0, line: { color: LINE, width: 1 } });
    // footer
    s.addText(`BenchBot  ·  ${audit.target_name}`, { x: 0.6, y: 7.06, w: 8, fontSize: 9, color: SLATE_LT });
    s.addText(String(pageNo).padStart(2, "0"), { x: 12.4, y: 7.06, w: 0.5, fontSize: 9, color: SLATE_LT, align: "right" });
    return s;
  }
  function card(s: PptxGenJS.Slide, x: number, y: number, w: number, h: number, fill = WHITE) {
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: LINE, width: 1 }, shadow: SHADOW });
  }
  function chip(s: PptxGenJS.Slide, x: number, y: number, label: string, color: string) {
    s.addText(label.toUpperCase(), {
      x, y, w: 2.4, h: 0.32, fontSize: 11, bold: true, color: WHITE, align: "center", valign: "middle",
      fill: { color }, rectRadius: 0.16, shape: pptx.ShapeType.roundRect, charSpacing: 1,
    });
  }

  // ── 1) TITLE ──
  const t = pptx.addSlide();
  t.background = { color: INK };
  t.addShape(pptx.ShapeType.roundRect, { x: 9.2, y: -1.6, w: 6, h: 6, rectRadius: 0.3, fill: { color: BRAND, transparency: 55 }, rotate: 25 });
  t.addShape(pptx.ShapeType.roundRect, { x: 10.6, y: 3.6, w: 5, h: 5, rectRadius: 0.3, fill: { color: VIOLET, transparency: 60 }, rotate: 18 });
  t.addText("BENCHBOT", { x: 0.7, y: 0.6, fontSize: 14, bold: true, color: VIOLET, charSpacing: 4 });
  t.addText(audit.target_name, { x: 0.66, y: 2.5, w: 8.5, fontSize: 50, bold: true, color: WHITE });
  t.addText("Competitive UX Audit", { x: 0.7, y: 3.75, fontSize: 24, color: "CBD5E1" });
  t.addText(hostFromUrl(audit.target_url), { x: 0.72, y: 4.5, fontSize: 14, color: SLATE_LT, fontFace: "Courier New" });
  if (j) {
    t.addShape(pptx.ShapeType.ellipse, { x: 9.7, y: 2.15, w: 2.5, h: 2.5, fill: { color: INK_2 }, line: { color: scoreColor(j.overall_score), width: 3 } });
    t.addText(String(j.overall_score), { x: 9.7, y: 2.5, w: 2.5, h: 1.4, fontSize: 60, bold: true, color: scoreColor(j.overall_score), align: "center" });
    t.addText("OVERALL", { x: 9.7, y: 3.75, w: 2.5, fontSize: 12, color: SLATE_LT, align: "center", charSpacing: 2 });
  }

  if (!j) {
    return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  }

  const target = bundle.scores.find((s) => s.competitor_id === null) ?? bundle.scores[0];
  const comps = bundle.scores.filter((s) => s.competitor_id !== null);
  const dims = ["UX", "Mobile", "Nav", "Content", "Conv.", "AI Vis."];
  const keys: (keyof AuditScore)[] = ["ux_score", "mobile_score", "navigation_score", "content_score", "conversion_score", "ai_visibility_score"];
  const targetVals = keys.map((k) => target[k] as number);
  const compAvg = keys.map((k) => (comps.length ? Math.round(comps.reduce((a, c) => a + (c[k] as number), 0) / comps.length) : 0));
  const overallOf = (s: AuditScore) => Math.round(keys.reduce((a, k) => a + (s[k] as number), 0) / keys.length);

  // ── 2) EXECUTIVE SUMMARY ──
  const ex = chrome("Executive Summary", `${audit.target_name} scores ${j.overall_score}/100`, BRAND);
  card(ex, 0.6, 1.75, 5.9, 4.9);
  chip(ex, 0.85, 1.95, "Top findings", CRIT);
  ex.addText(
    j.top_findings.slice(0, 5).map((x) => ({ text: x, options: { bullet: { code: "2022", indent: 14 }, fontSize: 12, color: INK_2, paraSpaceAfter: 9 } })),
    { x: 0.85, y: 2.45, w: 5.4, h: 4, valign: "top" },
  );
  card(ex, 6.85, 1.75, 5.9, 4.9);
  chip(ex, 7.1, 1.95, "Top opportunities", GOOD);
  ex.addText(
    j.top_opportunities.slice(0, 5).map((x) => ({ text: x, options: { bullet: { code: "2022", indent: 14 }, fontSize: 12, color: INK_2, paraSpaceAfter: 9 } })),
    { x: 7.1, y: 2.45, w: 5.4, h: 4, valign: "top" },
  );

  // ── 3) SCORES AT A GLANCE (charts) ──
  const sc = chrome("Benchmark", "Scores at a glance", VIOLET);
  card(sc, 0.6, 1.75, 6.0, 4.9);
  sc.addText("Your dimensions vs. competitor average", { x: 0.85, y: 1.95, fontSize: 12, bold: true, color: INK });
  sc.addChart(
    pptx.ChartType.radar,
    [
      { name: target.company_name, labels: dims, values: targetVals },
      { name: "Competitor avg", labels: dims, values: compAvg },
    ],
    {
      x: 0.7, y: 2.4, w: 5.8, h: 4.0, radarStyle: "standard",
      chartColors: [BRAND, SLATE_LT], chartColorsOpacity: 45,
      showLegend: true, legendPos: "b", legendFontSize: 10,
      catAxisLabelColor: SLATE, catAxisLabelFontSize: 10, valAxisHidden: true, showValue: false,
    },
  );
  card(sc, 6.85, 1.75, 5.9, 4.9);
  sc.addText("Overall score by company", { x: 7.1, y: 1.95, fontSize: 12, bold: true, color: INK });
  sc.addChart(
    pptx.ChartType.bar,
    [{ name: "Overall", labels: bundle.scores.map((s) => s.company_name), values: bundle.scores.map(overallOf) }],
    {
      x: 6.95, y: 2.4, w: 5.7, h: 4.0, barDir: "bar",
      chartColors: [BRAND, VIOLET, "5B8DEF", GOOD, WARN, "E879F9", "22D3EE"],
      showValue: true, dataLabelColor: WHITE, dataLabelFontSize: 10, dataLabelFontBold: true,
      valAxisHidden: true, valAxisMaxVal: 100, valAxisMinVal: 0,
      catAxisLabelColor: INK_2, catAxisLabelFontSize: 11, showLegend: false, barGapWidthPct: 40,
    },
  );

  // ── 4) COMPETITOR MATRIX (styled table) ──
  const mx = chrome("Competitor Matrix", "How the field compares", BRAND);
  const header = ["Company", ...dims, "Overall"].map((x) => ({
    text: x, options: { bold: true, color: WHITE, fill: { color: INK }, align: "center" as const, valign: "middle" as const, fontSize: 12 },
  }));
  const rows = bundle.scores.map((sr, i) => {
    const fill = sr.competitor_id === null ? "EAEDFC" : i % 2 ? "FFFFFF" : "F4F6FB";
    return [
      { text: sr.company_name, options: { bold: sr.competitor_id === null, color: INK, valign: "middle" as const, fill: { color: fill }, fontSize: 12 } },
      ...keys.map((k) => ({ text: String(sr[k]), options: { align: "center" as const, valign: "middle" as const, color: scoreColor(sr[k] as number), bold: true, fill: { color: fill } } })),
      { text: String(overallOf(sr)), options: { align: "center" as const, valign: "middle" as const, color: WHITE, bold: true, fill: { color: scoreColor(overallOf(sr)) } } },
    ];
  });
  mx.addTable([header, ...rows], {
    x: 0.6, y: 1.85, w: 12.13, colW: [3.13, 1.2, 1.2, 1.2, 1.2, 1.2, 1.3, 1.5],
    border: { type: "solid", color: WHITE, pt: 2 }, rowH: 0.5, valign: "middle", fontSize: 12,
  });

  // ── 5) SCREENSHOTS ──
  const shotCompanies = bundle.scores
    .map((s): { name: string; shot: Screenshot } | null => {
      const shots = bundle.screenshots.filter((x) => x.competitor_id === s.competitor_id);
      const shot = shots.find((x) => x.page_type === "homepage" && x.device_type === "desktop") || shots.find((x) => x.page_type === "homepage") || shots[0];
      return shot ? { name: s.company_name, shot } : null;
    })
    .filter((x): x is { name: string; shot: Screenshot } => x !== null)
    .slice(0, 6);

  if (shotCompanies.length) {
    const ss = chrome("Screenshots", "Homepages, side by side", VIOLET);
    const imgs = await Promise.all(shotCompanies.map((c) => loadImageDataUri(c.shot.storage_path)));
    const cols = 3;
    const cw = 3.9;
    const ch = 2.1;
    const gx = 0.6;
    const gy = 1.7;
    const padX = (12.13 - cols * cw) / (cols - 1);
    shotCompanies.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gx + col * (cw + padX);
      const y = gy + row * (ch + 0.56);
      card(ss, x, y, cw, ch + 0.42);
      const data = imgs[i];
      if (data) {
        ss.addImage({ data, x: x + 0.12, y: y + 0.12, w: cw - 0.24, h: ch - 0.1, sizing: { type: "cover", w: cw - 0.24, h: ch - 0.1 } });
      } else {
        ss.addText("preview unavailable", { x, y: y + ch / 2 - 0.2, w: cw, fontSize: 10, color: SLATE_LT, align: "center" });
      }
      ss.addText(c.name, { x: x + 0.12, y: y + ch + 0.04, w: cw - 0.24, fontSize: 11, bold: true, color: INK });
    });
  }

  // ── 6) HEURISTIC REVIEW (chart + recos) ──
  const hr = chrome("UX Heuristics", "Heuristic review", BRAND);
  card(hr, 0.6, 1.75, 6.4, 4.9);
  hr.addChart(
    pptx.ChartType.bar,
    [{ name: "Score", labels: j.heuristics.map((h) => h.label), values: j.heuristics.map((h) => h.score) }],
    {
      x: 0.7, y: 1.95, w: 6.2, h: 4.5, barDir: "bar",
      chartColors: [VIOLET], showValue: true, dataLabelColor: WHITE, dataLabelFontBold: true, dataLabelFontSize: 9,
      valAxisHidden: true, valAxisMaxVal: 100, valAxisMinVal: 0, catAxisLabelColor: INK_2, catAxisLabelFontSize: 9, showLegend: false, barGapWidthPct: 30,
    },
  );
  card(hr, 7.25, 1.75, 5.5, 4.9);
  hr.addText("Priority fixes", { x: 7.5, y: 1.95, fontSize: 12, bold: true, color: INK });
  const lowest = [...j.heuristics].sort((a, b) => a.score - b.score).slice(0, 4);
  hr.addText(
    lowest.map((h) => ({ text: `${h.label} (${h.score}) — ${h.recommendation}`, options: { bullet: { code: "2022", indent: 14 }, fontSize: 11, color: INK_2, paraSpaceAfter: 10 } })),
    { x: 7.5, y: 2.4, w: 5.05, h: 4, valign: "top" },
  );

  // ── 7) GAPS + CONTENT ──
  const gp = chrome("Gaps", "Where you're losing ground", WARN);
  card(gp, 0.6, 1.75, 5.9, 4.9);
  chip(gp, 0.85, 1.95, "Biggest gaps", WARN);
  gp.addText(
    j.biggest_gaps.map((x) => ({ text: x, options: { bullet: { code: "2022", indent: 14 }, fontSize: 12, color: INK_2, paraSpaceAfter: 10 } })),
    { x: 0.85, y: 2.5, w: 5.4, h: 4, valign: "top" },
  );
  card(gp, 6.85, 1.75, 5.9, 4.9);
  chip(gp, 7.1, 1.95, "Content gaps", VIOLET);
  gp.addText(
    j.content_gaps.map((g) => ({ text: `${g.topic} — ${g.opportunity}`, options: { bullet: { code: "2022", indent: 14 }, fontSize: 11.5, color: INK_2, paraSpaceAfter: 10 } })),
    { x: 7.1, y: 2.5, w: 5.4, h: 4, valign: "top" },
  );

  // ── 8) CONVERSION & AI VISIBILITY ──
  const cv = chrome("Conversion & GEO", "Convert more, get cited by AI", BRAND);
  const conv = j.conversion_audit;
  const ai = j.ai_visibility;
  card(cv, 0.6, 1.75, 5.9, 4.9);
  chip(cv, 0.85, 1.95, "Conversion", BRAND);
  cv.addText(
    [conv.cta_clarity, conv.form_length, conv.contact_flow, conv.trust_signals, conv.lead_magnets].map((x) => ({ text: x, options: { bullet: { code: "2022", indent: 14 }, fontSize: 11.5, color: INK_2, paraSpaceAfter: 9 } })),
    { x: 0.85, y: 2.5, w: 5.4, h: 4, valign: "top" },
  );
  card(cv, 6.85, 1.75, 5.9, 4.9);
  chip(cv, 7.1, 1.95, "AI / GEO visibility", VIOLET);
  cv.addText(
    [ai.schema_markup, ai.metadata, ai.faq_schema, ai.crawlability, ai.llm_clarity].map((x) => ({ text: x, options: { bullet: { code: "2022", indent: 14 }, fontSize: 11.5, color: INK_2, paraSpaceAfter: 9 } })),
    { x: 7.1, y: 2.5, w: 5.4, h: 4, valign: "top" },
  );

  // ── 9) NEXT STEPS (numbered cards) ──
  const ns = chrome("Action Plan", "Recommended next steps", GOOD);
  const steps = j.next_steps.slice(0, 5);
  steps.forEach((step, i) => {
    const y = 1.8 + i * 0.98;
    card(ns, 0.6, y, 12.13, 0.82, WHITE);
    ns.addShape(pptx.ShapeType.ellipse, { x: 0.85, y: y + 0.16, w: 0.5, h: 0.5, fill: { color: i === 0 ? BRAND : INK } });
    ns.addText(String(i + 1), { x: 0.85, y: y + 0.16, w: 0.5, h: 0.5, fontSize: 18, bold: true, color: WHITE, align: "center", valign: "middle" });
    ns.addText(step, { x: 1.6, y: y + 0.04, w: 10.9, h: 0.74, fontSize: 14, color: INK_2, valign: "middle" });
  });

  // ── 10) CLOSING ──
  const cl = pptx.addSlide();
  cl.background = { color: INK };
  cl.addShape(pptx.ShapeType.roundRect, { x: -1.5, y: 4.6, w: 6, h: 5, rectRadius: 0.3, fill: { color: BRAND_DK, transparency: 55 }, rotate: 20 });
  cl.addText("BENCHBOT", { x: 0.7, y: 0.6, fontSize: 14, bold: true, color: VIOLET, charSpacing: 4 });
  cl.addText("Benchmark anything.", { x: 0.66, y: 2.9, w: 11, fontSize: 44, bold: true, color: WHITE });
  cl.addText("Days of competitive research, distilled into a client-ready report.", { x: 0.7, y: 4.0, fontSize: 16, color: "CBD5E1" });
  cl.addText("Generated by BenchBot — figures in this report are AI-estimated.", { x: 0.72, y: 6.7, fontSize: 11, color: SLATE });

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
