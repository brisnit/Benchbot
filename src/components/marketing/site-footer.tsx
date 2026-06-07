import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo size="sm" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Competitive UX benchmarking, audited by AI. Days of research → a 15-minute report.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/example-report" className="hover:text-ink">Example report</Link>
          <Link href="/login" className="hover:text-ink">Log in</Link>
          <Link href="/signup" className="hover:text-ink">Start free</Link>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="container flex flex-col gap-1 py-4 text-xs text-muted-foreground md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} BenchBot. All rights reserved.</span>
          <span>Built for UX, strategy &amp; marketing teams.</span>
        </div>
      </div>
    </footer>
  );
}
