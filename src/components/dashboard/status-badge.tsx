import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, isRunning, statusVariant } from "@/lib/audit-helpers";
import type { AuditStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: AuditStatus }) {
  return (
    <Badge variant={statusVariant(status)} className="gap-1.5">
      {isRunning(status) && <Loader2 className="h-3 w-3 animate-spin" />}
      {STATUS_LABELS[status]}
    </Badge>
  );
}
