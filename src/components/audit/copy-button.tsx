"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function CopyButton({
  value,
  label = "Copy",
  toastLabel = "Copied to clipboard",
  variant = "secondary",
  size = "sm",
}: {
  value: string;
  label?: string;
  toastLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: toastLabel, variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: "Your browser blocked clipboard access.", variant: "error" });
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}
      {label}
    </Button>
  );
}
