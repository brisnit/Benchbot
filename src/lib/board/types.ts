// Collaborative board ("Team Setup") domain types.

export type BoardElementType = "text" | "sticky" | "shape" | "image";
export type ShapeKind = "rect" | "ellipse" | "diamond";

export interface BoardElement {
  id: string;
  type: BoardElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  color?: string; // sticky/shape fill or text colour
  shape?: ShapeKind;
  src?: string; // image URL
  fontSize?: number;
  z: number;
  updated_at: string;
  updated_by?: string;
}

export interface Board {
  id: string; // == workspace id
  workspace_id: string;
  elements: BoardElement[];
  seeded_audit_id?: string | null;
  updated_at: string;
}

export interface Presence {
  userId: string;
  name: string;
  color: string;
  x: number; // board coords
  y: number;
  lastSeen: number; // epoch ms
}

export type BoardOp =
  | { kind: "upsert"; element: BoardElement }
  | { kind: "delete"; id: string }
  | { kind: "clear" };

export const STICKY_COLORS = [
  "#FEF08A", // yellow
  "#FBCFE8", // pink
  "#BFDBFE", // blue
  "#BBF7D0", // green
  "#DDD6FE", // violet
  "#FED7AA", // orange
];

// Deterministic colour for a user (presence cursor / avatar).
export function colorForUser(userId: string): string {
  const palette = ["#3552E6", "#7C5CFC", "#16C098", "#F5A524", "#F31268", "#0EA5E9", "#E11D48", "#9333EA"];
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) % palette.length;
  return palette[h];
}
