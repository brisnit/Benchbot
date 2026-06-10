"use client";

import * as React from "react";
import {
  MousePointer2,
  StickyNote,
  Type,
  Square,
  Circle,
  Diamond,
  Image as ImageIcon,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  Users,
  Maximize,
  Frame as FrameIcon,
  Spline,
  MessageSquare,
  Send,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { TeamPanel } from "@/components/board/team-panel";
import { cn } from "@/lib/utils";
import { STICKY_COLORS, colorForUser } from "@/lib/board/types";
import type { BoardElement, BoardElementType, BoardOp, CommentMsg, Presence, ShapeKind } from "@/lib/board/types";

type Tool = "select" | "sticky" | "text" | "shape" | "image" | "frame" | "connector" | "comment";

interface AuditOption { id: string; label: string; }
interface Member { id: string; user_id: string; role: string; name: string; email: string; }

function newId() {
  return "be_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const DEFAULTS: Record<string, { w: number; h: number; fontSize: number }> = {
  sticky: { w: 200, h: 200, fontSize: 16 },
  text: { w: 240, h: 40, fontSize: 20 },
  shape: { w: 200, h: 140, fontSize: 16 },
  image: { w: 280, h: 190, fontSize: 14 },
  frame: { w: 560, h: 380, fontSize: 16 },
  comment: { w: 1, h: 1, fontSize: 14 },
};

const NODE_TYPES = new Set(["sticky", "text", "shape", "image"]);
function centerOf(el: BoardElement) {
  return { x: el.x + el.w / 2, y: el.y + el.h / 2 };
}

export function Whiteboard({
  workspaceId,
  currentUser,
  audits,
  members,
}: {
  workspaceId: string;
  currentUser: { id: string; name: string };
  audits: AuditOption[];
  members: Member[];
}) {
  const { toast } = useToast();
  const [elements, setElements] = React.useState<Record<string, BoardElement>>({});
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [openCommentId, setOpenCommentId] = React.useState<string | null>(null);
  const [tool, setTool] = React.useState<Tool>("select");
  const [shapeKind, setShapeKind] = React.useState<ShapeKind>("rect");
  const [color, setColor] = React.useState<string>(STICKY_COLORS[0]);
  const [view, setView] = React.useState({ x: 80, y: 140, scale: 1 });
  const [presences, setPresences] = React.useState<Presence[]>([]);
  const [connectStart, setConnectStart] = React.useState<string | null>(null);

  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const pendingRef = React.useRef<Set<string>>(new Set());
  const dragRef = React.useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; contained?: { id: string; ox: number; oy: number }[] } | null>(null);
  const resizeRef = React.useRef<{ id: string; sx: number; sy: number; ow: number; oh: number } | null>(null);
  const panRef = React.useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const viewRef = React.useRef(view);
  viewRef.current = view;
  const lastPresence = React.useRef(0);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const elementsRef = React.useRef(elements);
  elementsRef.current = elements;

  const toBoard = React.useCallback((clientX: number, clientY: number) => {
    const rect = surfaceRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (clientX - rect.left - v.x) / v.scale, y: (clientY - rect.top - v.y) / v.scale };
  }, []);

  const pushOps = React.useCallback(async (ops: BoardOp[]) => {
    try {
      await fetch("/api/board/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ops }) });
    } catch {
      /* offline tolerant */
    }
  }, []);

  const upsert = React.useCallback((el: BoardElement, persist = true) => {
    setElements((prev) => ({ ...prev, [el.id]: el }));
    if (persist) void pushOps([{ kind: "upsert", element: el }]);
  }, [pushOps]);

  const remove = React.useCallback((id: string) => {
    const el = elementsRef.current[id];
    const ops: BoardOp[] = [{ kind: "delete", id }];
    setElements((prev) => {
      const next = { ...prev };
      delete next[id];
      // cascade: drop connectors attached to a deleted node
      if (el && el.type !== "connector") {
        for (const e of Object.values(next)) {
          if (e.type === "connector" && (e.fromId === id || e.toId === id)) {
            delete next[e.id];
            ops.push({ kind: "delete", id: e.id });
          }
        }
      }
      return next;
    });
    setSelectedId((s) => (s === id ? null : s));
    void pushOps(ops);
  }, [pushOps]);

  const maxZ = React.useCallback(() => {
    const zs = Object.values(elementsRef.current).map((e) => e.z);
    return zs.length ? Math.max(...zs) : 0;
  }, []);

  const createAt = React.useCallback((type: BoardElementType, bx: number, by: number, extra?: Partial<BoardElement>) => {
    const d = DEFAULTS[type];
    const isPin = type === "comment";
    const el: BoardElement = {
      id: newId(),
      type,
      x: Math.round(isPin ? bx : bx - d.w / 2),
      y: Math.round(isPin ? by : by - d.h / 2),
      w: d.w,
      h: d.h,
      text: type === "image" || type === "comment" || type === "connector" ? undefined : type === "frame" ? "Frame" : "",
      color: type === "text" ? "#0B1117" : type === "shape" ? "#FFFFFF" : type === "frame" ? "#7C5CFC" : color,
      shape: type === "shape" ? shapeKind : undefined,
      fontSize: d.fontSize,
      comments: type === "comment" ? [] : undefined,
      z: type === "frame" ? -1000 + maxZ() : maxZ() + 1,
      updated_at: new Date().toISOString(),
      updated_by: currentUser.id,
      ...extra,
    };
    upsert(el);
    setSelectedId(el.id);
    setTool("select");
    if (type === "sticky" || type === "text" || type === "shape" || type === "frame") {
      pendingRef.current.add(el.id);
      setEditingId(el.id);
    }
    if (type === "comment") setOpenCommentId(el.id);
    return el;
  }, [color, shapeKind, maxZ, upsert, currentUser.id]);

  function onSurfaceMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const { x, y } = toBoard(e.clientX, e.clientY);
    if (tool === "sticky" || tool === "text" || tool === "shape" || tool === "frame" || tool === "comment") {
      createAt(tool, x, y);
      return;
    }
    if (tool === "image") {
      const url = window.prompt("Paste an image URL:");
      if (url) createAt("image", x, y, { src: url });
      setTool("select");
      return;
    }
    if (tool === "connector") {
      setConnectStart(null); // clicking empty cancels
      return;
    }
    setSelectedId(null);
    setEditingId(null);
    setOpenCommentId(null);
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: viewRef.current.x, oy: viewRef.current.y };
  }

  function onElementMouseDown(e: React.MouseEvent, el: BoardElement) {
    if (e.button !== 0) return;
    // connector tool: pick endpoints
    if (tool === "connector") {
      e.stopPropagation();
      if (!connectStart) {
        setConnectStart(el.id);
      } else if (connectStart !== el.id) {
        const conn: BoardElement = {
          id: newId(), type: "connector", fromId: connectStart, toId: el.id,
          x: 0, y: 0, w: 0, h: 0, color: "#64748B", z: maxZ() + 1,
          updated_at: new Date().toISOString(), updated_by: currentUser.id,
        };
        upsert(conn);
        setConnectStart(null);
        setTool("select");
      }
      return;
    }
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedId(el.id);
    const bumped = { ...el, z: el.type === "frame" ? el.z : maxZ() + 1 };
    setElements((prev) => ({ ...prev, [el.id]: bumped }));
    pendingRef.current.add(el.id);
    const drag: { id: string; sx: number; sy: number; ox: number; oy: number; contained?: { id: string; ox: number; oy: number }[] } = { id: el.id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y };
    // frames carry their contained elements
    if (el.type === "frame") {
      const contained: { id: string; ox: number; oy: number }[] = [];
      for (const other of Object.values(elementsRef.current)) {
        if (other.id === el.id || other.type === "connector") continue;
        const c = centerOf(other);
        if (c.x >= el.x && c.x <= el.x + el.w && c.y >= el.y && c.y <= el.y + el.h) {
          contained.push({ id: other.id, ox: other.x, oy: other.y });
          pendingRef.current.add(other.id);
        }
      }
      drag.contained = contained;
    }
    dragRef.current = drag;
  }

  function onResizeMouseDown(e: React.MouseEvent, el: BoardElement) {
    e.stopPropagation();
    resizeRef.current = { id: el.id, sx: e.clientX, sy: e.clientY, ow: el.w, oh: el.h };
    pendingRef.current.add(el.id);
  }

  React.useEffect(() => {
    function move(e: MouseEvent) {
      const v = viewRef.current;
      if (dragRef.current) {
        const d = dragRef.current;
        const dx = (e.clientX - d.sx) / v.scale;
        const dy = (e.clientY - d.sy) / v.scale;
        setElements((prev) => {
          const next = { ...prev };
          const el = next[d.id];
          if (el) next[d.id] = { ...el, x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) };
          if (d.contained) for (const c of d.contained) {
            const ce = next[c.id];
            if (ce) next[c.id] = { ...ce, x: Math.round(c.ox + dx), y: Math.round(c.oy + dy) };
          }
          return next;
        });
      } else if (resizeRef.current) {
        const r = resizeRef.current;
        const dw = (e.clientX - r.sx) / v.scale;
        const dh = (e.clientY - r.sy) / v.scale;
        setElements((prev) => {
          const el = prev[r.id];
          if (!el) return prev;
          return { ...prev, [r.id]: { ...el, w: Math.max(40, Math.round(r.ow + dw)), h: Math.max(30, Math.round(r.oh + dh)) } };
        });
      } else if (panRef.current) {
        const p = panRef.current;
        setView((cur) => ({ ...cur, x: p.ox + (e.clientX - p.sx), y: p.oy + (e.clientY - p.sy) }));
      }
      const now = Date.now();
      if (now - lastPresence.current > 200 && surfaceRef.current) {
        lastPresence.current = now;
        const b = toBoard(e.clientX, e.clientY);
        void fetch("/api/board/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ x: b.x, y: b.y }) }).catch(() => {});
      }
    }
    function up() {
      if (dragRef.current) {
        const d = dragRef.current;
        const ops: BoardOp[] = [];
        const el = elementsRef.current[d.id];
        if (el) ops.push({ kind: "upsert", element: el });
        if (d.contained) for (const c of d.contained) {
          const ce = elementsRef.current[c.id];
          if (ce) ops.push({ kind: "upsert", element: ce });
          pendingRef.current.delete(c.id);
        }
        if (ops.length) void pushOps(ops);
        pendingRef.current.delete(d.id);
        dragRef.current = null;
      }
      if (resizeRef.current) {
        const el = elementsRef.current[resizeRef.current.id];
        if (el) void pushOps([{ kind: "upsert", element: el }]);
        pendingRef.current.delete(resizeRef.current.id);
        resizeRef.current = null;
      }
      panRef.current = null;
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [pushOps, toBoard]);

  function onWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = surfaceRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setView((v) => {
        const scale = Math.min(2.5, Math.max(0.2, v.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
        const k = scale / v.scale;
        return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    } else {
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  }

  function zoomBy(factor: number) {
    setView((v) => {
      const scale = Math.min(2.5, Math.max(0.2, v.scale * factor));
      const rect = surfaceRef.current?.getBoundingClientRect();
      const cx = rect ? rect.width / 2 : 400;
      const cy = rect ? rect.height / 2 : 300;
      const k = scale / v.scale;
      return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  }

  function commitText(id: string, text: string) {
    const el = elementsRef.current[id];
    if (el) upsert({ ...el, text, updated_at: new Date().toISOString() });
    pendingRef.current.delete(id);
    setEditingId(null);
  }

  function addComment(id: string, text: string) {
    const el = elementsRef.current[id];
    if (!el || !text.trim()) return;
    const msg: CommentMsg = { id: newId(), author: currentUser.name, text: text.trim(), at: new Date().toISOString() };
    upsert({ ...el, comments: [...(el.comments ?? []), msg], updated_at: new Date().toISOString() });
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingId || openCommentId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) { e.preventDefault(); remove(selectedId); }
      if (e.key === "v") setTool("select");
      if (e.key === "n") setTool("sticky");
      if (e.key === "t") setTool("text");
      if (e.key === "f") setTool("frame");
      if (e.key === "c") setTool("connector");
      if (e.key === "Escape") { setConnectStart(null); setTool("select"); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, openCommentId, selectedId, remove]);

  React.useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch("/api/board", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        const serverEls: BoardElement[] = data.board?.elements ?? [];
        setElements((prev) => {
          const next: Record<string, BoardElement> = {};
          for (const el of serverEls) next[el.id] = pendingRef.current.has(el.id) && prev[el.id] ? prev[el.id] : el;
          for (const id of pendingRef.current) if (!next[id] && prev[id]) next[id] = prev[id];
          return next;
        });
        setPresences((data.presence ?? []).filter((p: Presence) => p.userId !== currentUser.id));
      } catch {
        /* ignore */
      }
    }
    tick();
    const iv = setInterval(tick, 1200);
    return () => { alive = false; clearInterval(iv); };
  }, [currentUser.id]);

  async function loadAudit(auditId: string) {
    try {
      const res = await fetch("/api/board/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auditId, replace: true }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = await res.json();
      const map: Record<string, BoardElement> = {};
      for (const el of data.board.elements as BoardElement[]) map[el.id] = el;
      setElements(map);
      setView({ x: 80, y: 160, scale: 0.8 });
      toast({ title: "Audit added to the board", variant: "success" });
    } catch (e) {
      toast({ title: "Couldn't load audit", description: (e as Error).message, variant: "error" });
    }
  }

  async function clearBoard() {
    if (!window.confirm("Clear the entire board for everyone?")) return;
    setElements({});
    await pushOps([{ kind: "clear" }]);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2_000_000) { toast({ title: "Image too large", description: "Use an image under 2 MB or paste a URL.", variant: "error" }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const rect = surfaceRef.current!.getBoundingClientRect();
      const c = toBoard(rect.left + rect.width / 2, rect.top + rect.height / 2);
      createAt("image", c.x, c.y, { src: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  const all = Object.values(elements);
  const frames = all.filter((e) => e.type === "frame").sort((a, b) => a.z - b.z);
  const connectors = all.filter((e) => e.type === "connector");
  const nodes = all.filter((e) => NODE_TYPES.has(e.type)).sort((a, b) => a.z - b.z);
  const comments = all.filter((e) => e.type === "comment");
  const cursor = tool === "select" ? (panRef.current ? "grabbing" : "default") : "crosshair";
  const onlineIds = new Set<string>([currentUser.id, ...presences.map((p) => p.userId)]);
  const openComment = openCommentId ? elements[openCommentId] : null;

  return (
    <div className="relative h-[calc(100vh-9.5rem)] overflow-hidden rounded-xl border border-border bg-[#F4F5FA]">
      {/* Toolbar */}
      <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-white px-2 py-1.5 shadow-lg">
        <ToolBtn active={tool === "select"} onClick={() => setTool("select")} label="Select (V)"><MousePointer2 className="h-4 w-4" /></ToolBtn>
        <ToolBtn active={tool === "sticky"} onClick={() => setTool("sticky")} label="Sticky note (N)"><StickyNote className="h-4 w-4" /></ToolBtn>
        <ToolBtn active={tool === "text"} onClick={() => setTool("text")} label="Text (T)"><Type className="h-4 w-4" /></ToolBtn>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button onClick={() => setTool("shape")} className={cn("flex h-9 items-center justify-center rounded-lg px-2 transition-colors", tool === "shape" ? "bg-brand text-white" : "text-slate-600 hover:bg-secondary")} title="Shape">
              {shapeKind === "ellipse" ? <Circle className="h-4 w-4" /> : shapeKind === "diamond" ? <Diamond className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { setShapeKind("rect"); setTool("shape"); }}><Square className="h-4 w-4" /> Rectangle</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setShapeKind("ellipse"); setTool("shape"); }}><Circle className="h-4 w-4" /> Ellipse</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setShapeKind("diamond"); setTool("shape"); }}><Diamond className="h-4 w-4" /> Diamond</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ToolBtn active={tool === "frame"} onClick={() => setTool("frame")} label="Frame / section (F)"><FrameIcon className="h-4 w-4" /></ToolBtn>
        <ToolBtn active={tool === "connector"} onClick={() => { setTool("connector"); setConnectStart(null); }} label="Connector (C)"><Spline className="h-4 w-4" /></ToolBtn>
        <ToolBtn active={tool === "comment"} onClick={() => setTool("comment")} label="Comment"><MessageSquare className="h-4 w-4" /></ToolBtn>
        <ToolBtn active={tool === "image"} onClick={() => setTool("image")} label="Image by URL"><ImageIcon className="h-4 w-4" /></ToolBtn>
        <button onClick={() => fileRef.current?.click()} className="flex h-9 items-center justify-center rounded-lg px-2 text-slate-600 transition-colors hover:bg-secondary" title="Upload image"><Plus className="h-4 w-4" /></button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <div className="mx-1 h-6 w-px bg-border" />
        <div className="flex items-center gap-1">
          {STICKY_COLORS.map((c) => (
            <button key={c} onClick={() => { setColor(c); if (selectedId) { const el = elements[selectedId]; if (el && (el.type === "sticky" || el.type === "shape" || el.type === "frame")) upsert({ ...el, color: c }); } }} className={cn("h-5 w-5 rounded-full border transition-transform hover:scale-110", color === c ? "border-ink ring-2 ring-brand/30" : "border-black/10")} style={{ backgroundColor: c }} title="Colour" />
          ))}
        </div>
        <div className="mx-1 h-6 w-px bg-border" />
        <button onClick={() => selectedId && remove(selectedId)} disabled={!selectedId} className="flex h-9 items-center justify-center rounded-lg px-2 text-slate-600 transition-colors hover:bg-critical/10 hover:text-critical disabled:opacity-40" title="Delete (Del)"><Trash2 className="h-4 w-4" /></button>
      </div>

      {/* Top-right: team + collaborators + audit loader */}
      <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
        <TeamPanel initialMembers={members} onlineIds={onlineIds} />
        <Collaborators presences={presences} you={currentUser} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="gradient"><Sparkles className="h-4 w-4" /> Load audit</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Add an audit&apos;s findings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {audits.length === 0 && <DropdownMenuItem disabled>No audits yet</DropdownMenuItem>}
            {audits.map((a) => (<DropdownMenuItem key={a.id} onClick={() => loadAudit(a.id)}>{a.label}</DropdownMenuItem>))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={clearBoard} className="text-critical focus:text-critical"><Trash2 className="h-4 w-4" /> Clear board</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* connector hint */}
      {tool === "connector" && (
        <div className="absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-xs text-white">
          {connectStart ? "Click a second element to connect" : "Click the first element to connect"}
        </div>
      )}

      {/* Zoom */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1 rounded-lg border border-border bg-white px-1.5 py-1 shadow-md">
        <button onClick={() => zoomBy(0.9)} className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-secondary"><Minus className="h-4 w-4" /></button>
        <span className="w-12 text-center font-mono text-xs tabular-nums">{Math.round(view.scale * 100)}%</span>
        <button onClick={() => zoomBy(1.1)} className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-secondary"><Plus className="h-4 w-4" /></button>
        <button onClick={() => setView({ x: 80, y: 140, scale: 1 })} className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-secondary" title="Reset view"><Maximize className="h-4 w-4" /></button>
      </div>

      {/* Surface */}
      <div
        ref={surfaceRef}
        className="absolute inset-0 select-none"
        style={{ cursor, backgroundImage: "radial-gradient(#d3d8e6 1px, transparent 1px)", backgroundSize: `${24 * view.scale}px ${24 * view.scale}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
        onMouseDown={onSurfaceMouseDown}
        onWheel={onWheel}
      >
        <div style={{ position: "absolute", left: 0, top: 0, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: "0 0" }}>
          {/* frames (behind) */}
          {frames.map((el) => (
            <FrameView key={el.id} el={el} selected={selectedId === el.id} editing={editingId === el.id} onMouseDown={(e) => onElementMouseDown(e, el)} onDoubleClick={() => { pendingRef.current.add(el.id); setSelectedId(el.id); setEditingId(el.id); }} onResizeMouseDown={(e) => onResizeMouseDown(e, el)} onCommitText={(t) => commitText(el.id, t)} />
          ))}

          {/* connectors */}
          <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
            <defs>
              <marker id="bb-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill="#64748B" />
              </marker>
            </defs>
            {connectors.map((c) => {
              const from = c.fromId ? elements[c.fromId] : undefined;
              const to = c.toId ? elements[c.toId] : undefined;
              if (!from || !to) return null;
              const a = centerOf(from);
              const b = centerOf(to);
              return <line key={c.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#64748B" strokeWidth={2} markerEnd="url(#bb-arrow)" />;
            })}
          </svg>

          {/* nodes */}
          {nodes.map((el) => (
            <ElementView key={el.id} el={el} selected={selectedId === el.id} editing={editingId === el.id} connecting={connectStart === el.id} onMouseDown={(e) => onElementMouseDown(e, el)} onDoubleClick={() => { if (el.type === "image") return; pendingRef.current.add(el.id); setSelectedId(el.id); setEditingId(el.id); }} onResizeMouseDown={(e) => onResizeMouseDown(e, el)} onCommitText={(t) => commitText(el.id, t)} />
          ))}

          {/* comment pins */}
          {comments.map((el) => (
            <button
              key={el.id}
              onMouseDown={(e) => { e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); setOpenCommentId((o) => (o === el.id ? null : el.id)); }}
              className="absolute z-40 flex h-8 w-8 -translate-y-full items-center justify-center rounded-full rounded-bl-none border-2 border-white shadow-md"
              style={{ left: el.x, top: el.y, backgroundColor: el.resolved ? "#94A3B8" : "#7C5CFC" }}
              title="Comment"
            >
              <span className="text-[11px] font-semibold text-white">{el.comments?.length || 0}</span>
            </button>
          ))}

          {/* presence cursors */}
          {presences.map((p) => (
            <div key={p.userId} className="pointer-events-none absolute z-50" style={{ left: p.x, top: p.y }}>
              <svg width="20" height="20" viewBox="0 0 20 20" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))" }}>
                <path d="M2 2 L2 16 L6 12 L9 18 L11 17 L8 11 L14 11 Z" fill={p.color} stroke="white" strokeWidth="1" />
              </svg>
              <span className="ml-3 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: p.color }}>{p.name}</span>
            </div>
          ))}
        </div>

        {/* comment thread popover (screen-positioned for readability) */}
        {openComment && (
          <CommentThread
            el={openComment}
            screenX={openComment.x * view.scale + view.x}
            screenY={openComment.y * view.scale + view.y}
            onClose={() => setOpenCommentId(null)}
            onAdd={(t) => addComment(openComment.id, t)}
            onResolve={() => { upsert({ ...openComment, resolved: !openComment.resolved }); }}
            onDelete={() => { remove(openComment.id); setOpenCommentId(null); }}
          />
        )}
      </div>

      {nodes.length === 0 && frames.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-6 py-5 text-center">
            <Users className="mx-auto h-7 w-7 text-brand" />
            <p className="mt-2 text-sm font-medium text-ink">Your team canvas is empty</p>
            <p className="mt-1 text-xs text-muted-foreground">Pick a tool above, or <strong>Load audit</strong> to drop the findings in as sticky notes.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} className={cn("flex h-9 items-center justify-center rounded-lg px-2 transition-colors", active ? "bg-brand text-white" : "text-slate-600 hover:bg-secondary")}>{children}</button>
  );
}

function Collaborators({ presences, you }: { presences: Presence[]; you: { id: string; name: string } }) {
  const people = [{ userId: you.id, name: you.name, color: colorForUser(you.id) }, ...presences];
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5 shadow-md">
      <div className="flex -space-x-2">
        {people.slice(0, 6).map((p) => (
          <span key={p.userId} title={p.userId === you.id ? `${p.name} (you)` : p.name} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white" style={{ backgroundColor: p.color }}>{p.name.slice(0, 2).toUpperCase()}</span>
        ))}
      </div>
      <span className="hidden text-xs text-muted-foreground sm:inline">{people.length} online</span>
    </div>
  );
}

function FrameView({ el, selected, editing, onMouseDown, onDoubleClick, onResizeMouseDown, onCommitText }: { el: BoardElement; selected: boolean; editing: boolean; onMouseDown: (e: React.MouseEvent) => void; onDoubleClick: () => void; onResizeMouseDown: (e: React.MouseEvent) => void; onCommitText: (t: string) => void; }) {
  return (
    <div style={{ position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, zIndex: 1 }} className={cn("rounded-xl border-2 border-dashed", selected ? "border-brand" : "border-slate-300")} onMouseDown={onMouseDown} onDoubleClick={onDoubleClick}>
      <div className="absolute -top-7 left-0 flex items-center gap-1">
        {editing ? (
          <input autoFocus defaultValue={el.text} onBlur={(e) => onCommitText(e.target.value)} onMouseDown={(e) => e.stopPropagation()} className="rounded-md border-0 bg-white px-2 py-0.5 text-sm font-semibold text-ink shadow-sm outline-none ring-2 ring-brand/30" style={{ color: el.color }} />
        ) : (
          <span className="rounded-md px-2 py-0.5 text-sm font-semibold" style={{ color: el.color }}>{el.text || "Frame"}</span>
        )}
      </div>
      <div className="h-full w-full rounded-xl" style={{ backgroundColor: (el.color || "#7C5CFC") + "0d" }} />
      {selected && <span onMouseDown={onResizeMouseDown} className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-white bg-brand shadow" />}
    </div>
  );
}

function ElementView({ el, selected, editing, connecting, onMouseDown, onDoubleClick, onResizeMouseDown, onCommitText }: { el: BoardElement; selected: boolean; editing: boolean; connecting?: boolean; onMouseDown: (e: React.MouseEvent) => void; onDoubleClick: () => void; onResizeMouseDown: (e: React.MouseEvent) => void; onCommitText: (text: string) => void; }) {
  const base: React.CSSProperties = { position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, zIndex: el.z };
  const ring = connecting ? "outline outline-2 outline-violet" : selected ? "outline outline-2 outline-brand" : "";

  let inner: React.ReactNode = null;
  if (el.type === "image") {
    inner = el.src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={el.src} alt="" className="h-full w-full rounded-md object-cover" draggable={false} />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary text-xs text-muted-foreground">No image</div>
    );
  } else {
    const textEl = editing ? (
      <textarea autoFocus defaultValue={el.text} onBlur={(e) => onCommitText(e.target.value)} onMouseDown={(e) => e.stopPropagation()} className="h-full w-full resize-none border-0 bg-transparent text-center outline-none" style={{ fontSize: el.fontSize, color: el.type === "text" ? el.color : "#0B1117" }} />
    ) : (
      <div className={cn("h-full w-full overflow-hidden whitespace-pre-wrap break-words", el.type === "text" ? "text-left" : "flex items-center justify-center text-center")} style={{ fontSize: el.fontSize, color: el.type === "text" ? el.color : "#0B1117" }}>{el.text || ""}</div>
    );
    if (el.type === "sticky") inner = <div className="h-full w-full rounded-md p-3 shadow-sm" style={{ backgroundColor: el.color }}>{textEl}</div>;
    else if (el.type === "text") inner = <div className="h-full w-full p-1">{textEl}</div>;
    else {
      const shapeStyle: React.CSSProperties = { backgroundColor: el.color, border: "2px solid #94A3B8", borderRadius: el.shape === "ellipse" ? "50%" : 8, clipPath: el.shape === "diamond" ? "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" : undefined };
      inner = <div className="flex h-full w-full items-center justify-center p-3" style={shapeStyle}>{textEl}</div>;
    }
  }

  return (
    <div style={base} className={cn("group", ring)} onMouseDown={onMouseDown} onDoubleClick={onDoubleClick}>
      {inner}
      {selected && <span onMouseDown={onResizeMouseDown} className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-white bg-brand shadow" />}
    </div>
  );
}

function CommentThread({ el, screenX, screenY, onClose, onAdd, onResolve, onDelete }: { el: BoardElement; screenX: number; screenY: number; onClose: () => void; onAdd: (t: string) => void; onResolve: () => void; onDelete: () => void; }) {
  const [text, setText] = React.useState("");
  const msgs = el.comments ?? [];
  return (
    <div className="absolute z-50 w-72 rounded-xl border border-border bg-white shadow-2xl" style={{ left: Math.max(8, Math.min(screenX + 12, (typeof window !== "undefined" ? window.innerWidth : 1200) - 320)), top: Math.max(8, screenY + 8) }} onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold">Comment</span>
        <div className="flex items-center gap-1">
          <button onClick={onResolve} title={el.resolved ? "Reopen" : "Resolve"} className={cn("rounded p-1 hover:bg-secondary", el.resolved ? "text-good" : "text-muted-foreground")}><Check className="h-4 w-4" /></button>
          <button onClick={onDelete} title="Delete" className="rounded p-1 text-muted-foreground hover:text-critical"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="max-h-56 space-y-2 overflow-y-auto px-3 py-2 scrollbar-thin">
        {msgs.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">Start the discussion…</p>}
        {msgs.map((m) => (
          <div key={m.id} className="rounded-lg bg-secondary/60 px-2.5 py-1.5">
            <p className="text-xs font-semibold text-ink">{m.author}</p>
            <p className="text-sm text-slate-700">{m.text}</p>
          </div>
        ))}
      </div>
      <form className="flex items-center gap-1.5 border-t border-border p-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onAdd(text); setText(""); } }}>
        <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" className="h-8 flex-1 rounded-md border border-input bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white hover:bg-brand-700"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
