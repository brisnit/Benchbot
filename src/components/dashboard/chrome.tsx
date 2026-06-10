"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { cn } from "@/lib/utils";
import { ChromeContext, type ChromeCtx } from "@/components/dashboard/chrome-context";
import type { User, Workspace } from "@/lib/types";

// Routes that default to a full-bleed, sidebar-collapsed layout (the canvas).
function isImmersive(pathname: string) {
  return pathname.startsWith("/dashboard/workspace");
}

export function DashboardShell({
  user,
  workspace,
  children,
}: {
  user: User;
  workspace: Workspace;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const immersive = isImmersive(pathname);
  const [collapsed, setCollapsed] = React.useState(immersive);

  // Auto-collapse on immersive routes, auto-expand elsewhere (on navigation).
  React.useEffect(() => {
    setCollapsed(immersive);
  }, [immersive]);

  const value = React.useMemo<ChromeCtx>(
    () => ({ collapsed, setCollapsed, toggle: () => setCollapsed((c) => !c) }),
    [collapsed],
  );

  return (
    <ChromeContext.Provider value={value}>
      <div className={cn("flex bg-background", immersive ? "h-screen overflow-hidden" : "min-h-screen")}>
        {!collapsed && <Sidebar />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={user} workspace={workspace} />
          <main className={cn("min-w-0 flex-1", immersive ? "flex min-h-0 flex-col p-0" : "px-4 py-6 md:px-8 md:py-8")}>
            {children}
          </main>
          <MobileNav />
        </div>
      </div>
    </ChromeContext.Provider>
  );
}

export { useChrome } from "@/components/dashboard/chrome-context";
