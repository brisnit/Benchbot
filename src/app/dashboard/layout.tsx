import { requireSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/chrome";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireSession();

  return (
    <DashboardShell user={user} workspace={workspace}>
      {children}
    </DashboardShell>
  );
}
