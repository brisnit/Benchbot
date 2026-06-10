"use client";

import * as React from "react";
import { Users, X, UserPlus, Loader2, Trash2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { colorForUser } from "@/lib/board/types";

interface Member {
  id: string;
  user_id: string;
  role: string;
  name: string;
  email: string;
}

const ROLE_VARIANT: Record<string, "brand" | "violet" | "secondary"> = {
  owner: "brand",
  admin: "violet",
  editor: "secondary",
  viewer: "secondary",
  client: "secondary",
};

export function TeamPanel({
  initialMembers,
  onlineIds,
}: {
  initialMembers: Member[];
  onlineIds: Set<string>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [members, setMembers] = React.useState<Member[]>(initialMembers);
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/workspace/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to invite");
      setMembers(data.members);
      setEmail("");
      toast({ title: "Teammate added", description: `${data.member.email} can now collaborate.`, variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't invite", description: (err as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(memberId: string) {
    const prev = members;
    setMembers((m) => m.filter((x) => x.id !== memberId));
    try {
      const res = await fetch("/api/workspace/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (res.ok) setMembers(data.members);
    } catch {
      setMembers(prev);
    }
  }

  const onlineCount = members.filter((m) => onlineIds.has(m.user_id)).length;

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Users className="h-4 w-4" /> Team ({members.length})
      </Button>

      {open && (
        <div className="fixed inset-0 z-50" onMouseDown={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink/20 backdrop-blur-[1px]" />
          <div
            className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-border bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Team</h2>
                <p className="text-xs text-muted-foreground">
                  {members.length} member{members.length === 1 ? "" : "s"} · {onlineCount} online
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={invite} className="flex gap-2 border-b border-border px-5 py-4">
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" variant="gradient" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Invite
              </Button>
            </form>

            <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4 scrollbar-thin">
              {members.map((m) => {
                const online = onlineIds.has(m.user_id);
                return (
                  <div key={m.id} className="group flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: colorForUser(m.user_id) }}>
                        {m.name.slice(0, 2).toUpperCase()}
                        {online && <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-good text-white" strokeWidth={3} />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={ROLE_VARIANT[m.role] ?? "secondary"} className="capitalize">{m.role}</Badge>
                      {m.role !== "owner" && (
                        <button
                          onClick={() => remove(m.id)}
                          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-critical group-hover:opacity-100"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border px-5 py-3">
              <p className={cn("text-xs text-muted-foreground")}>
                Anyone you add can open <strong>Team Setup</strong> and collaborate on the canvas in
                real time. Invitations are seat-based in this MVP.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
