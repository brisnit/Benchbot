import { uid } from "@/lib/utils";
import type { AuditBundle } from "@/lib/types";
import type { BoardElement } from "@/lib/board/types";

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
