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
import { cn } from "@/lib/utils";
import { STICKY_COLORS, colorForUser } from "@/lib/board/types";
import type { BoardElement, BoardElementType, BoardOp, Presence, ShapeKind } from "@/lib/board/types";

type Tool = "select" | "sticky" | "text" | "shape" | "image";

interface AuditOption {
  id: string;
  label: string;
}

function newId() {
  return "be_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const DEFAULTS: Record<BoardElementType, { w: number; h: number; fontSize: number }> = {
  sticky: { w: 200, h: 200, fontSize: 16 },
  text: { w: 240, h: 40, fontSize: 20 },
  shape: { w: 200, h: 140, fontSize: 16 },
  image: { w: 280, h: 190, fontSize: 14 },
};

export function Whiteboard({
  workspaceId,
  currentUser,
  audits,
}: {
  workspaceId: string;
  currentUser: { id: string; name: string };
  audits: AuditOption[];
}) {
  const { toast } = useToast();
  const [elements, setElements] = React.useState<Record<string, BoardElement>>({});
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [tool, setTool] = React.useState<Tool>("select");
  const [shapeKind, setShapeKind] = React.useState<ShapeKind>("rect");
  const [color, setColor] = React.useState<string>(STICKY_COLORS[0]);
  const [view, setView] = React.useState({ x: 80, y: 140, scale: 1 });
  const [presences, setPresences] = React.useState<Presence[]>([]);

  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const pendingRef = React.useRef<Set<string>>(new Set()); // ids being locally edited/dragged
  const dragRef = React.useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resizeRef = React.useRef<{ id: string; sx: number; sy: number; ow: number; oh: number } | null>(null);
  const panRef = React.useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const viewRef = React.useRef(view);
  viewRef.current = view;
  const lastPresence = React.useRef(0);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // ---- coordinate helpers ----
  const toBoard = React.useCallback((clientX: number, clientY: number) => {
    const rect = surfaceRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - rect.left - v.x) / v.scale,
      y: (clientY - rect.top - v.y) / v.scale,
    };
  }, []);

  // ---- server ops ----
  const pushOps = React.useCallback(async (ops: BoardOp[]) => {
    try {
      await fetch("/api/board/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops }),
      });
    } catch {
      /* offline-tolerant */
    }
  }, []);

  const upsert = React.useCallback(
    (el: BoardElement, persist = true) => {
      setElements((prev) => ({ ...prev, [el.id]: el }));
      if (persist) void pushOps([{ kind: "upsert", element: el }]);
    },
    [pushOps],
  );

  const remove = React.useCallback(
    (id: string) => {
      setElements((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSelectedId((s) => (s === id ? null : s));
      void pushOps([{ kind: "delete", id }]);
    },
    [pushOps],
  );

  const maxZ = React.useCallback(() => {
    const zs = Object.values(elements).map((e) => e.z);
    return zs.length ? Math.max(...zs) : 0;
  }, [elements]);

  // ---- create element ----
  const createAt = React.useCallback(
    (type: BoardElementType, bx: number, by: number, extra?: Partial<BoardElement>) => {
      const d = DEFAULTS[type];
      const el: BoardElement = {
        id: newId(),
        type,
        x: Math.round(bx - d.w / 2),
        y: Math.round(by - d.h / 2),
        w: d.w,
        h: d.h,
        text: type === "image" ? undefined : "",
        color: type === "text" ? "#0B1117" : type === "shape" ? "#FFFFFF" : color,
        shape: type === "shape" ? shapeKind : undefined,
        fontSize: d.fontSize,
        z: maxZ() + 1,
        updated_at: new Date().toISOString(),
        updated_by: currentUser.id,
        ...extra,
      };
      upsert(el);
      setSelectedId(el.id);
      setTool("select");
      if (type === "sticky" || type === "text" || type === "shape") {
        pendingRef.current.add(el.id);
        setEditingId(el.id);
      }
      return el;
    },
    [color, shapeKind, maxZ, upsert, currentUser.id],
  );

  // ---- surface interactions ----
  function onSurfaceMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const { x, y } = toBoard(e.clientX, e.clientY);
    if (tool === "sticky" || tool === "text" || tool === "shape") {
      createAt(tool, x, y);
      return;
    }
    if (tool === "image") {
      const url = window.prompt("Paste an image URL:");
      if (url) createAt("image", x, y, { src: url });
      setTool("select");
      return;
    }
    // select tool → pan + clear selection
    setSelectedId(null);
    setEditingId(null);
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: viewRef.current.x, oy: viewRef.current.y };
  }

  function onElementMouseDown(e: React.MouseEvent, el: BoardElement) {
    if (tool !== "select" || e.button !== 0) return;
    e.stopPropagation();
    setSelectedId(el.id);
    // bring to front
    const bumped = { ...el, z: maxZ() + 1 };
    setElements((prev) => ({ ...prev, [el.id]: bumped }));
    dragRef.current = { id: el.id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y };
    pendingRef.current.add(el.id);
  }

  function onResizeMouseDown(e: React.MouseEvent, el: BoardElement) {
    e.stopPropagation();
    resizeRef.current = { id: el.id, sx: e.clientX, sy: e.clientY, ow: el.w, oh: el.h };
    pendingRef.current.add(el.id);
  }

  // ---- global mouse handlers ----
  React.useEffect(() => {
    function move(e: MouseEvent) {
      const v = viewRef.current;
      if (dragRef.current) {
        const d = dragRef.current;
        const dx = (e.clientX - d.sx) / v.scale;
        const dy = (e.clientY - d.sy) / v.scale;
        setElements((prev) => {
          const el = prev[d.id];
          if (!el) return prev;
          return { ...prev, [d.id]: { ...el, x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) } };
        });
      } else if (resizeRef.current) {
        const r = resizeRef.current;
        const dw = (e.clientX - r.sx) / v.scale;
        const dh = (e.clientY - r.sy) / v.scale;
        setElements((prev) => {
          const el = prev[r.id];
          if (!el) return prev;
          return { ...prev, [r.id]: { ...el, w: Math.max(60, Math.round(r.ow + dw)), h: Math.max(40, Math.round(r.oh + dh)) } };
        });
      } else if (panRef.current) {
        const p = panRef.current;
        setView((cur) => ({ ...cur, x: p.ox + (e.clientX - p.sx), y: p.oy + (e.clientY - p.sy) }));
      }
      // broadcast presence (throttled)
      const now = Date.now();
      if (now - lastPresence.current > 200 && surfaceRef.current) {
        lastPresence.current = now;
        const b = toBoard(e.clientX, e.clientY);
        void fetch("/api/board/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x: b.x, y: b.y }),
        }).catch(() => {});
      }
    }
    function up() {
      if (dragRef.current) {
        const el = elementsRef.current[dragRef.current.id];
        if (el) void pushOps([{ kind: "upsert", element: el }]);
        pendingRef.current.delete(dragRef.current.id);
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

  // keep a ref of elements for the mouseup commit
  const elementsRef = React.useRef(elements);
  elementsRef.current = elements;

  // ---- wheel pan/zoom ----
  function onWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = surfaceRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setView((v) => {
        const scale = Math.min(2.5, Math.max(0.25, v.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
        const k = scale / v.scale;
        return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    } else {
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  }

  function zoomBy(factor: number) {
    setView((v) => {
      const scale = Math.min(2.5, Math.max(0.25, v.scale * factor));
      const rect = surfaceRef.current?.getBoundingClientRect();
      const cx = rect ? rect.width / 2 : 400;
      const cy = rect ? rect.height / 2 : 300;
      const k = scale / v.scale;
      return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  }

  // ---- text editing ----
  function commitText(id: string, text: string) {
    const el = elementsRef.current[id];
    if (el) upsert({ ...el, text, updated_at: new Date().toISOString() });
    pendingRef.current.delete(id);
    setEditingId(null);
  }

  // ---- keyboard ----
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        remove(selectedId);
      }
      if (e.key === "v") setTool("select");
      if (e.key === "n") setTool("sticky");
      if (e.key === "t") setTool("text");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, selectedId, remove]);

  // ---- live sync (poll) ----
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
          for (const el of serverEls) {
            next[el.id] = pendingRef.current.has(el.id) && prev[el.id] ? prev[el.id] : el;
          }
          // keep local-only elements that are still pending (not yet acked)
          for (const id of pendingRef.current) {
            if (!next[id] && prev[id]) next[id] = prev[id];
          }
          return next;
        });
        setPresences((data.presence ?? []).filter((p: Presence) => p.userId !== currentUser.id));
      } catch {
        /* ignore */
      }
    }
    tick();
    const iv = setInterval(tick, 1200);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [currentUser.id]);

  // ---- audit seeding ----
  async function loadAudit(auditId: string, replace: boolean) {
    try {
      const res = await fetch("/api/board/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, replace }),
      });
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
    if (file.size > 2_000_000) {
      toast({ title: "Image too large", description: "Please use an image under 2 MB or paste a URL.", variant: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rect = surfaceRef.current!.getBoundingClientRect();
      const c = toBoard(rect.left + rect.width / 2, rect.top + rect.height / 2);
      createAt("image", c.x, c.y, { src: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  const els = Object.values(elements).sort((a, b) => a.z - b.z);
  const cursor = tool === "select" ? (panRef.current ? "grabbing" : "default") : "crosshair";

  return (
    <div className="relative h-[calc(100vh-9.5rem)] overflow-hidden rounded-xl border border-border bg-[#F4F5FA]">
      {/* Toolbar */}
      <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-white px-2 py-1.5 shadow-lg">
        <ToolBtn active={tool === "select"} onClick={() => setTool("select")} label="Select (V)">
          <MousePointer2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={tool === "sticky"} onClick={() => setTool("sticky")} label="Sticky note (N)">
          <StickyNote className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={tool === "text"} onClick={() => setTool("text")} label="Text (T)">
          <Type className="h-4 w-4" />
        </ToolBtn>
        {/* shape with submenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={() => setTool("shape")}
              className={cn(
                "flex h-9 items-center justify-center rounded-lg px-2 transition-colors",
                tool === "shape" ? "bg-brand text-white" : "text-slate-600 hover:bg-secondary",
              )}
              title="Shape"
            >
              {shapeKind === "ellipse" ? <Circle className="h-4 w-4" /> : shapeKind === "diamond" ? <Diamond className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { setShapeKind("rect"); setTool("shape"); }}><Square className="h-4 w-4" /> Rectangle</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setShapeKind("ellipse"); setTool("shape"); }}><Circle className="h-4 w-4" /> Ellipse</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setShapeKind("diamond"); setTool("shape"); }}><Diamond className="h-4 w-4" /> Diamond</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ToolBtn active={tool === "image"} onClick={() => setTool("image")} label="Image by URL">
          <ImageIcon className="h-4 w-4" />
        </ToolBtn>
        <button onClick={() => fileRef.current?.click()} className="flex h-9 items-center justify-center rounded-lg px-2 text-slate-600 transition-colors hover:bg-secondary" title="Upload image">
          <Plus className="h-4 w-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        <div className="mx-1 h-6 w-px bg-border" />
        {/* colors */}
        <div className="flex items-center gap-1">
          {STICKY_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                if (selectedId) {
                  const el = elements[selectedId];
                  if (el && (el.type === "sticky" || el.type === "shape")) upsert({ ...el, color: c });
                }
              }}
              className={cn("h-5 w-5 rounded-full border transition-transform hover:scale-110", color === c ? "border-ink ring-2 ring-brand/30" : "border-black/10")}
              style={{ backgroundColor: c }}
              title="Colour"
            />
          ))}
        </div>

        <div className="mx-1 h-6 w-px bg-border" />
        <button onClick={() => selectedId && remove(selectedId)} disabled={!selectedId} className="flex h-9 items-center justify-center rounded-lg px-2 text-slate-600 transition-colors hover:bg-critical/10 hover:text-critical disabled:opacity-40" title="Delete (Del)">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Top-right: collaborators + audit loader */}
      <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
        <Collaborators presences={presences} you={currentUser} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="gradient">
              <Sparkles className="h-4 w-4" /> Load audit
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Add an audit&apos;s findings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {audits.length === 0 && <DropdownMenuItem disabled>No audits yet</DropdownMenuItem>}
            {audits.map((a) => (
              <DropdownMenuItem key={a.id} onClick={() => loadAudit(a.id, true)}>
                {a.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={clearBoard} className="text-critical focus:text-critical">
              <Trash2 className="h-4 w-4" /> Clear board
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Zoom controls */}
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
        style={{
          cursor,
          backgroundImage: "radial-gradient(#d3d8e6 1px, transparent 1px)",
          backgroundSize: `${24 * view.scale}px ${24 * view.scale}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
        onMouseDown={onSurfaceMouseDown}
        onWheel={onWheel}
      >
        <div style={{ position: "absolute", left: 0, top: 0, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: "0 0" }}>
          {els.map((el) => (
            <ElementView
              key={el.id}
              el={el}
              selected={selectedId === el.id}
              editing={editingId === el.id}
              onMouseDown={(e) => onElementMouseDown(e, el)}
              onDoubleClick={() => {
                if (el.type === "image") return;
                pendingRef.current.add(el.id);
                setSelectedId(el.id);
                setEditingId(el.id);
              }}
              onResizeMouseDown={(e) => onResizeMouseDown(e, el)}
              onCommitText={(text) => commitText(el.id, text)}
            />
          ))}

          {/* presence cursors */}
          {presences.map((p) => (
            <div key={p.userId} className="pointer-events-none absolute z-40" style={{ left: p.x, top: p.y }}>
              <svg width="20" height="20" viewBox="0 0 20 20" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))" }}>
                <path d="M2 2 L2 16 L6 12 L9 18 L11 17 L8 11 L14 11 Z" fill={p.color} stroke="white" strokeWidth="1" />
              </svg>
              <span className="ml-3 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: p.color }}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty hint */}
      {els.length === 0 && (
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
    <button
      onClick={onClick}
      title={label}
      className={cn("flex h-9 items-center justify-center rounded-lg px-2 transition-colors", active ? "bg-brand text-white" : "text-slate-600 hover:bg-secondary")}
    >
      {children}
    </button>
  );
}

function Collaborators({ presences, you }: { presences: Presence[]; you: { id: string; name: string } }) {
  const people = [{ userId: you.id, name: you.name, color: colorForUser(you.id) }, ...presences];
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5 shadow-md">
      <Users className="h-4 w-4 text-muted-foreground" />
      <div className="flex -space-x-2">
        {people.slice(0, 8).map((p) => (
          <span
            key={p.userId}
            title={p.userId === you.id ? `${p.name} (you)` : p.name}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white"
            style={{ backgroundColor: p.color }}
          >
            {p.name.slice(0, 2).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{people.length} online</span>
    </div>
  );
}

function ElementView({
  el,
  selected,
  editing,
  onMouseDown,
  onDoubleClick,
  onResizeMouseDown,
  onCommitText,
}: {
  el: BoardElement;
  selected: boolean;
  editing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  onCommitText: (text: string) => void;
}) {
  const base: React.CSSProperties = { position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, zIndex: el.z };

  const ring = selected ? "outline outline-2 outline-brand" : "";

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
      <textarea
        autoFocus
        defaultValue={el.text}
        onBlur={(e) => onCommitText(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()}
        className="h-full w-full resize-none border-0 bg-transparent text-center outline-none"
        style={{ fontSize: el.fontSize, color: el.type === "text" ? el.color : "#0B1117" }}
      />
    ) : (
      <div
        className={cn("h-full w-full overflow-hidden whitespace-pre-wrap break-words", el.type === "text" ? "text-left" : "flex items-center justify-center text-center")}
        style={{ fontSize: el.fontSize, color: el.type === "text" ? el.color : "#0B1117" }}
      >
        {el.text || (el.type === "text" ? "" : "")}
      </div>
    );

    if (el.type === "sticky") {
      inner = (
        <div className="h-full w-full rounded-md p-3 shadow-sm" style={{ backgroundColor: el.color }}>
          {textEl}
        </div>
      );
    } else if (el.type === "text") {
      inner = <div className="h-full w-full p-1">{textEl}</div>;
    } else {
      // shape
      const shapeStyle: React.CSSProperties = {
        backgroundColor: el.color,
        border: "2px solid #94A3B8",
        borderRadius: el.shape === "ellipse" ? "50%" : 8,
        clipPath: el.shape === "diamond" ? "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" : undefined,
      };
      inner = (
        <div className="flex h-full w-full items-center justify-center p-3" style={shapeStyle}>
          {textEl}
        </div>
      );
    }
  }

  return (
    <div
      style={base}
      className={cn("group", ring, el.type === "text" && !selected && "outline-none")}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      {inner}
      {selected && (
        <span
          onMouseDown={onResizeMouseDown}
          className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-white bg-brand shadow"
        />
      )}
    </div>
  );
}
