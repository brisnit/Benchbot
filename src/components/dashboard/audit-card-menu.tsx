"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Trash2, ArrowUpRight, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// Per-card actions (open / delete). Lives above the card's stretched link so
// clicking it never navigates.
export function AuditCardMenu({ auditId, href }: { auditId: string; href: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/audits/${auditId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not delete");
      toast({ title: "Audit deleted", variant: "success" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({ title: "Couldn't delete", description: (err as Error).message, variant: "error" });
      setDeleting(false);
    }
  }

  return (
    <div className="relative z-20" onClick={(e) => e.preventDefault()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Audit actions"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-ink"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem asChild>
            <Link href={href}>
              <ArrowUpRight className="h-4 w-4" /> Open audit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-critical focus:text-critical"
            onSelect={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete audit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this audit?</DialogTitle>
            <DialogDescription>
              This permanently removes the audit, its screenshots, scores and report. This can&apos;t
              be undone.
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
  );
}
