"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function BillingActions({ plan }: { plan: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const paid = plan !== "guest" && plan !== "enterprise";

  async function cancel() {
    if (!window.confirm("Cancel your subscription and return to the free Guest plan?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/billing/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "guest" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Subscription cancelled", description: "You're back on the free Guest plan.", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "Couldn't cancel", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="gradient">
        <Link href="/pricing">
          <Sparkles className="h-4 w-4" /> {paid ? "Change plan" : "Upgrade plan"}
        </Link>
      </Button>
      {paid && (
        <Button variant="ghost" onClick={cancel} disabled={busy} className="text-critical hover:bg-critical/10 hover:text-critical">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Cancel subscription
        </Button>
      )}
    </div>
  );
}
