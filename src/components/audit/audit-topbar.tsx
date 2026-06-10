"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Globe, Loader2, RotateCw, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ScorePill } from "@/components/ui/score";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { auditGoalLabel } from "@/lib/constants";
import { cn, hostFromUrl } from "@/lib/utils";
import type { Audit } from "@/lib/types";

export function AuditTopbar({
  audit,
  overallScore,
}: {
  audit: Audit;
  overallScore?: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [reRunning, setReRunning] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const base = `/dashboard/audits/${audit.id}`;
  const apiBase = `/api/audits/${audit.id}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/screenshots`, label: "Screenshots" },
    { href: `${base}/sitemap`, label: "Sitemap" },
    { href: `${base}/report`, label: "Report" },
  ];

  async function reRun() {
    setReRunning(true);
    try {
      const res = await fetch(`${apiBase}/run`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not start");
      toast({ title: "Re-running audit", variant: "success" });
      router.push(base);
      router.refresh();
    } catch (err) {
      toast({ title: "Couldn't re-run", description: (err as Error).message, variant: "error" });
      setReRunning(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(apiBase, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not delete");
      toast({ title: "Audit deleted", variant: "success" });
      router.push("/dashboard/audits");
      router.refresh();
    } catch (err) {
      toast({ title: "Couldn't delete", description: (err as Error).message, variant: "error" });
      setDeleting(false);
    }
  }

  return (
    <div className="mb-6">
      <Link
        href="/dashboard/audits"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> All audits
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
            <Globe className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight">{audit.target_name}</h1>
              <StatusBadge status={audit.status} />
              {typeof overallScore === "number" && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  Overall <ScorePill score={overallScore} />
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <a
                href={audit.target_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs hover:text-brand"
              >
                {hostFromUrl(audit.target_url)} <ExternalLink className="h-3 w-3" />
              </a>
              <span>·</span>
              <Badge variant="secondary">{auditGoalLabel(audit.audit_goal)}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={reRun} disabled={reRunning}>
            {reRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Re-run
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Delete audit">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this audit?</DialogTitle>
                <DialogDescription>
                  This permanently removes the audit, its screenshots, scores and report. This can&apos;t be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <Button variant="destructive" onClick={remove} disabled={deleting}>
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete audit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand text-ink"
                  : "border-transparent text-muted-foreground hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
