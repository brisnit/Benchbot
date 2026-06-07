import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col px-6 py-8">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_20%,rgba(124,92,252,0.35),transparent),radial-gradient(50%_50%_at_20%_80%,rgba(53,82,230,0.30),transparent)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <span className="font-mono text-xs text-sidebar-muted">BenchBot · v1.0</span>
          <div>
            <p className="font-display text-3xl font-bold leading-tight">
              Days of competitive research, distilled into a 15-minute report.
            </p>
            <p className="mt-4 max-w-md text-white/70">
              Heuristic scoring, screenshots, visual sitemaps, content gaps and executive
              recommendations — all in one client-ready audit.
            </p>
          </div>
          <div className="flex gap-6 font-mono text-xs text-sidebar-muted">
            <span>10 heuristics</span>
            <span>·</span>
            <span>10 competitors</span>
            <span>·</span>
            <span>desktop + mobile</span>
          </div>
        </div>
      </div>
    </div>
  );
}
