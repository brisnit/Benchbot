import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireSession();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} workspace={workspace} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
