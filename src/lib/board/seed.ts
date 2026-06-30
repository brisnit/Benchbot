import { uid } from "@/lib/utils";
import type { AuditBundle } from "@/lib/types";
import type { BoardElement } from "@/lib/board/types";
import type { AppComparisonRecord } from "@/lib/apps/record";

// Lays an audit out on the board as labelled columns of sticky notes so a team
// can start working with the findings immediately.

const COL_W = 300;
const STICKY_W = 260;
const STICKY_H = 120;
const GAP_Y = 16;

interface Column {
  title: string;
  color: string;
  items: string[];
}

export function buildSeedElements(bundle: AuditBundle): BoardElement[] {
  const now = new Date().toISOString();
  const elements: BoardElement[] = [];
  let z = 1;
  const add = (e: Omit<BoardElement, "id" | "z" | "updated_at">) =>
    elements.push({ ...e, id: uid("be_"), z: z++, updated_at: now });

  const report = bundle.report?.report_json;
  const target = bundle.audit.target_name || "Target";

  // Title
  add({
    type: "text",
    x: 40,
    y: -90,
    w: 720,
    h: 56,
    text: `${target} — Competitive Audit Workspace`,
    color: "#0B1117",
    fontSize: 30,
  });
  add({
    type: "text",
    x: 40,
    y: -44,
    w: 760,
    h: 30,
    text: "Drag notes, add your own, and turn findings into a plan together.",
    color: "#647488",
    fontSize: 16,
  });

  if (!report) return elements;

  const columns: Column[] = [
    { title: "🔎 Top Findings", color: "#FBCFE8", items: report.top_findings },
    { title: "🚀 Opportunities", color: "#BBF7D0", items: report.top_opportunities },
    { title: "⚠️ Biggest Gaps", color: "#FED7AA", items: report.biggest_gaps },
    { title: "✅ Next Steps", color: "#BFDBFE", items: report.next_steps },
  ];

  columns.forEach((col, ci) => {
    const x = 40 + ci * COL_W;
    // column heading
    add({
      type: "text",
      x,
      y: 0,
      w: STICKY_W,
      h: 34,
      text: col.title,
      color: "#0B1117",
      fontSize: 20,
    });
    let y = 44;
    for (const item of col.items.slice(0, 6)) {
      add({
        type: "sticky",
        x,
        y,
        w: STICKY_W,
        h: STICKY_H,
        text: item,
        color: col.color,
        fontSize: 14,
      });
      y += STICKY_H + GAP_Y;
    }
  });

  // Scores column as a single panel of text
  const scoreX = 40 + columns.length * COL_W;
  add({ type: "text", x: scoreX, y: 0, w: STICKY_W, h: 34, text: "📊 Scores", color: "#0B1117", fontSize: 20 });
  let sy = 44;
  for (const s of bundle.scores) {
    const line = `${s.company_name}\nUX ${s.ux_score} · Mobile ${s.mobile_score} · Nav ${s.navigation_score}\nContent ${s.content_score} · Conv ${s.conversion_score} · AI ${s.ai_visibility_score}`;
    add({
      type: "sticky",
      x: scoreX,
      y: sy,
      w: STICKY_W,
      h: STICKY_H,
      text: line,
      color: s.competitor_id === null ? "#DDD6FE" : "#FEF08A",
      fontSize: 13,
    });
    sy += STICKY_H + GAP_Y;
  }

  // A free "Parking lot" note
  add({
    type: "shape",
    shape: "rect",
    x: 40,
    y: sy + 40,
    w: 360,
    h: 160,
    text: "Parking lot — drop questions & ideas here",
    color: "#FFFFFF",
    fontSize: 15,
  });

  // Screenshots — one homepage capture per company, grouped in a frame.
  const shotForCompany = (competitorId: string | null) => {
    const shots = bundle.screenshots.filter((s) => s.competitor_id === competitorId);
    return (
      shots.find((s) => s.page_type === "homepage" && s.device_type === "desktop") ||
      shots.find((s) => s.page_type === "homepage") ||
      shots[0]
    );
  };
  const shotCompanies = bundle.scores
    .map((s) => ({ id: s.competitor_id, name: s.company_name, shot: shotForCompany(s.competitor_id) }))
    .filter((c) => c.shot);

  if (shotCompanies.length > 0) {
    const shotY = sy + 260;
    const imgW = 260;
    const imgH = 165;
    const stride = imgW + 28;
    // frame around the screenshots strip
    add({
      type: "frame",
      x: 24,
      y: shotY - 52,
      w: shotCompanies.length * stride + 24,
      h: imgH + 110,
      text: "📸 Screenshots",
      color: "#3552E6",
      fontSize: 16,
    });
    shotCompanies.forEach((c, i) => {
      const x = 40 + i * stride;
      add({ type: "text", x, y: shotY - 6, w: imgW, h: 24, text: c.name, color: "#0B1117", fontSize: 14 });
      add({
        type: "image",
        x,
        y: shotY + 22,
        w: imgW,
        h: imgH,
        src: c.shot!.storage_path,
        color: "#FFFFFF",
        fontSize: 12,
      });
    });
  }

  return elements;
}

// Lay an App Compare result onto the board for collaborative review.
export function buildAppSeedElements(rec: AppComparisonRecord): BoardElement[] {
  const now = new Date().toISOString();
  const elements: BoardElement[] = [];
  let z = 1;
  const add = (e: Omit<BoardElement, "id" | "z" | "updated_at">) =>
    elements.push({ ...e, id: uid("be_"), z: z++, updated_at: now });

  const target = rec.apps.find((a) => a.id === rec.target_id) ?? rec.apps[0];

  add({ type: "text", x: 40, y: -90, w: 760, h: 56, text: `${target.name} — App Store Benchmark`, color: "#0B1117", fontSize: 30 });
  add({ type: "text", x: 40, y: -44, w: 820, h: 30, text: "Drag notes, add your own, and turn the comparison into a plan.", color: "#647488", fontSize: 16 });

  // Column 1: Apps (one sticky per app)
  add({ type: "text", x: 40, y: 0, w: STICKY_W, h: 34, text: "📱 Apps", color: "#0B1117", fontSize: 20 });
  let y = 44;
  for (const a of rec.apps) {
    add({
      type: "sticky",
      x: 40,
      y,
      w: STICKY_W,
      h: STICKY_H,
      text: `${a.name}\n${a.rating || "—"}★ · ${a.ratingCount.toLocaleString()} ratings\n${a.category} · ${a.price}`,
      color: a.id === target.id ? "#DDD6FE" : "#FEF08A",
      fontSize: 13,
    });
    y += STICKY_H + GAP_Y;
  }

  // Column 2: Recommendations
  add({ type: "text", x: 40 + COL_W, y: 0, w: STICKY_W, h: 34, text: "🚀 Recommendations", color: "#0B1117", fontSize: 20 });
  let ry = 44;
  for (const r of rec.comparison.recommendations.slice(0, 6)) {
    add({ type: "sticky", x: 40 + COL_W, y: ry, w: STICKY_W, h: STICKY_H, text: r, color: "#BBF7D0", fontSize: 13 });
    ry += STICKY_H + GAP_Y;
  }

  // Column 3: Target strengths / weaknesses
  const ins = rec.comparison.insights.find((i) => i.appId === target.id);
  add({ type: "text", x: 40 + COL_W * 2, y: 0, w: STICKY_W, h: 34, text: "⚖️ Strengths & gaps", color: "#0B1117", fontSize: 20 });
  let sy = 44;
  for (const s of ins?.strengths ?? []) {
    add({ type: "sticky", x: 40 + COL_W * 2, y: sy, w: STICKY_W, h: STICKY_H, text: `✓ ${s}`, color: "#E8FAF3", fontSize: 13 });
    sy += STICKY_H + GAP_Y;
  }
  for (const w of ins?.weaknesses ?? []) {
    add({ type: "sticky", x: 40 + COL_W * 2, y: sy, w: STICKY_W, h: STICKY_H, text: `△ ${w}`, color: "#FED7AA", fontSize: 13 });
    sy += STICKY_H + GAP_Y;
  }

  // Screenshots row for the target app
  const shots = (target.screenshots.length ? target.screenshots : target.ipadScreenshots).slice(0, 5);
  if (shots.length) {
    const bottomY = Math.max(44 + rec.apps.length * (STICKY_H + GAP_Y), sy, ry) + 80;
    add({ type: "text", x: 40, y: bottomY, w: 400, h: 30, text: `📸 ${target.name} screenshots`, color: "#0B1117", fontSize: 18 });
    let sx = 40;
    for (const src of shots) {
      add({ type: "image", x: sx, y: bottomY + 40, w: 150, h: 320, src, color: "#FFFFFF", fontSize: 12 });
      sx += 168;
    }
  }

  return elements;
}
