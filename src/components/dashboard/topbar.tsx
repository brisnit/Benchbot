"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Plus, Settings, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { signOutAction } from "@/app/dashboard/actions";
import type { User, Workspace } from "@/lib/types";

export function Topbar({ user, workspace }: { user: User; workspace: Workspace }) {
  const initials = (user.name || user.email)
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
      {/* mobile logo */}
      <Link href="/dashboard" className="lg:hidden">
        <Logo size="sm" />
      </Link>

      <div className="hidden items-center gap-2 lg:flex">
        <span className="text-sm text-muted-foreground">Workspace</span>
        <span className="rounded-md bg-secondary px-2.5 py-1 text-sm font-medium text-ink">
          {workspace.name}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="gradient" className="hidden sm:inline-flex">
          <Link href="/dashboard/audits/new">
            <Plus className="h-4 w-4" /> New audit
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-secondary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                {initials}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name || "Account"}</span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <UserIcon className="h-4 w-4" /> Account settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/workspace">
                <Settings className="h-4 w-4" /> Workspace
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <button type="submit" className="w-full">
                <DropdownMenuItem className="text-critical focus:text-critical">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
