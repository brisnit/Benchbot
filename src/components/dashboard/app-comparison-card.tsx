import Link from "next/link";
import { Smartphone, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";
import type { AppComparisonRecord } from "@/lib/apps/record";

export function AppComparisonCard({ record }: { record: AppComparisonRecord }) {
  const target = record.apps.find((a) => a.id === record.target_id) ?? record.apps[0];
  const href = `/dashboard/apps/${record.id}`;
  return (
    <Card className="group relative h-full p-5 transition-all hover:border-brand/40 hover:shadow-md">
      <Link href={href} className="absolute inset-0 z-0 rounded-xl" aria-label={`Open ${record.target_name} comparison`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={target.icon} alt="" className="h-10 w-10 shrink-0 rounded-lg shadow-sm" />
            <div className="min-w-0">
              <p className="truncate font-display font-semibold text-ink">{record.target_name}</p>
              <p className="truncate text-xs text-muted-foreground">{target.developer || "App Store"}</p>
            </div>
          </div>
          <Badge variant="violet" className="gap-1"><Smartphone className="h-3 w-3" /> App</Badge>
        </div>

        {/* competitor icon stack */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex -space-x-2">
            {record.apps.slice(0, 5).map((a) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={a.id} src={a.icon} alt="" className="h-7 w-7 rounded-md border-2 border-white" title={a.name} />
            ))}
          </div>
          {record.apps.length > 5 && <span className="text-xs text-muted-foreground">+{record.apps.length - 5}</span>}
          {target.rating > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-warn text-warn" /> {target.rating}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="truncate">App comparison · {record.apps.length} apps</span>
          <span className="shrink-0">{relativeTime(record.created_at)}</span>
        </div>
      </div>
    </Card>
  );
}
