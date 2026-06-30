import { requireSession } from "@/lib/auth";
import { listAudits, listMembersEnriched, listAppComparisons } from "@/lib/db";
import { auditGoalLabel } from "@/lib/constants";
import { Whiteboard } from "@/components/board/whiteboard";

export const metadata = { title: "Workspace · BenchBot" };

export default async function TeamSetupPage() {
  const { user, workspace } = await requireSession();
  const audits = [
    ...listAudits(workspace.id)
      .filter((a) => a.status === "complete")
      .map((a) => ({
        id: a.id,
        kind: "web" as const,
        label: `${a.target_name} · ${auditGoalLabel(a.audit_goal)}`,
      })),
    ...listAppComparisons(workspace.id).map((r) => ({
      id: r.id,
      kind: "app" as const,
      label: `${r.target_name} · App comparison`,
    })),
  ];
  const members = listMembersEnriched(workspace.id);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border bg-background px-4 py-2.5 md:px-6">
        <h1 className="font-display text-lg font-bold tracking-tight">
          Workspace
          <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
            {workspace.name}
          </span>
        </h1>
      </div>

      <div className="min-h-0 flex-1">
        <Whiteboard
          workspaceId={workspace.id}
          currentUser={{ id: user.id, name: user.name || user.email }}
          audits={audits}
          members={members}
        />
      </div>
    </div>
  );
}
