import { requireSession } from "@/lib/auth";
import { listAudits, listMembersEnriched } from "@/lib/db";
import { auditGoalLabel } from "@/lib/constants";
import { Whiteboard } from "@/components/board/whiteboard";

export const metadata = { title: "Team Setup · BenchBot" };

export default async function TeamSetupPage() {
  const { user, workspace } = await requireSession();
  const audits = listAudits(workspace.id)
    .filter((a) => a.status === "complete")
    .map((a) => ({
      id: a.id,
      label: `${a.target_name} · ${auditGoalLabel(a.audit_goal)}`,
    }));
  const members = listMembersEnriched(workspace.id);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Team Setup</h1>
        <p className="text-sm text-muted-foreground">
          A shared canvas for <span className="font-medium text-ink">{workspace.name}</span> — add
          sticky notes, text, shapes and images, and work through the audit together in real time.
        </p>
      </div>

      <Whiteboard
        workspaceId={workspace.id}
        currentUser={{ id: user.id, name: user.name || user.email }}
        audits={audits}
        members={members}
      />
    </div>
  );
}
