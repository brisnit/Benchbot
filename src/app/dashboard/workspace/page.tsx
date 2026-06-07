import { Users, Plus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listMembers, getUser, listAudits } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Workspace · BenchBot" };

const ROLE_VARIANT: Record<string, "brand" | "secondary" | "violet"> = {
  owner: "brand",
  admin: "violet",
  editor: "secondary",
  viewer: "secondary",
  client: "secondary",
};

export default async function WorkspacePage() {
  const { workspace } = await requireSession();
  const members = listMembers(workspace.id);
  const auditCount = listAudits(workspace.id).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Workspace" description="Manage your workspace details and team." />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name">Workspace name</Label>
              <Input id="ws-name" defaultValue={workspace.name} />
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Plan</p>
                <p className="font-medium capitalize">{workspace.plan ?? "free"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Audits</p>
                <p className="font-medium">{auditCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(workspace.created_at)}</p>
              </div>
            </div>
            <Button variant="secondary" disabled>Save changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-brand" /> Team members
            </CardTitle>
            <Button size="sm" variant="secondary" disabled>
              <Plus className="h-4 w-4" /> Invite
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((m) => {
              const u = getUser(m.user_id);
              const initials = (u?.name || u?.email || "?").slice(0, 2).toUpperCase();
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                      {initials}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{u?.name ?? "Member"}</p>
                      <p className="text-xs text-muted-foreground">{u?.email}</p>
                    </div>
                  </div>
                  <Badge variant={ROLE_VARIANT[m.role] ?? "secondary"} className="capitalize">{m.role}</Badge>
                </div>
              );
            })}
            <p className="pt-1 text-xs text-muted-foreground">Team invitations are stubbed in this MVP.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
