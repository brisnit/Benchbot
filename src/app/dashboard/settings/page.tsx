import { KeyRound, Sparkles, Globe } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { hasOpenAI, hasSupabase, env } from "@/lib/env";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Settings · BenchBot" };

function StatusBadge({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
  return <Badge variant={on ? "good" : "warn"}>{on ? onLabel : offLabel}</Badge>;
}

export default async function SettingsPage() {
  const { user } = await requireSession();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Manage your account and integrations." />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue={user.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user.email} disabled />
            </div>
            <Button variant="secondary" disabled>Save changes</Button>
            <p className="text-xs text-muted-foreground">Profile editing is stubbed in this MVP.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-violet" /> Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <IntegrationRow
              icon={KeyRound}
              title="OpenAI"
              description={hasOpenAI() ? `Connected · model ${env.openaiModel}` : "Not configured — AI output is deterministic & estimated."}
              status={<StatusBadge on={hasOpenAI()} onLabel="Connected" offLabel="Demo mode" />}
            />
            <IntegrationRow
              icon={Globe}
              title="Supabase"
              description={hasSupabase() ? "Connected — using Postgres + Auth + Storage." : "Not configured — using local file-backed store."}
              status={<StatusBadge on={hasSupabase()} onLabel="Connected" offLabel="Local store" />}
            />
            <IntegrationRow
              icon={Globe}
              title="Real crawling (Playwright)"
              description={env.enableRealCrawl ? "Enabled — live screenshots & page data." : "Disabled — realistic placeholder crawl data."}
              status={<StatusBadge on={env.enableRealCrawl} onLabel="Enabled" offLabel="Off" />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Billing is Stripe-ready but stubbed for this MVP. Manage your plan from the pricing page.
            </p>
            <Button variant="secondary" className="mt-4" disabled>Manage billing (coming soon)</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IntegrationRow({
  icon: Icon,
  title,
  description,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {status}
    </div>
  );
}
