import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { env, hasOpenAI } from "@/lib/env";
import { getStore } from "@/lib/store/local-store";

// Lightweight health check + storage diagnostics. Used by Railway's deploy
// healthcheck and to verify the persistent volume at /app/.data is working.
export const dynamic = "force-dynamic";

// Captured once when the process starts (i.e. on each deploy/restart).
const BOOT_TIME = new Date().toISOString();

const DATA_DIR = path.join(process.cwd(), ".data");
const SHOTS_DIR = path.join(DATA_DIR, "screenshots");
const MARKER = path.join(DATA_DIR, ".first-boot");

function storageDiag() {
  const diag: Record<string, unknown> = { dataDir: DATA_DIR };
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });

    // writable?
    const probe = path.join(DATA_DIR, ".probe");
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    diag.writable = true;

    // Is .data a SEPARATE filesystem (a mounted volume) vs the container root?
    // A Railway volume is a distinct mount, so total block count differs.
    try {
      const root = fs.statfsSync(process.cwd());
      const data = fs.statfsSync(DATA_DIR);
      const sep = root.blocks !== data.blocks || root.bsize !== data.bsize;
      diag.separateMount = sep;
      diag.volumeLikelyMounted = sep;
      diag.freeMB = Math.round((data.bavail * data.bsize) / (1024 * 1024));
      diag.totalMB = Math.round((data.blocks * data.bsize) / (1024 * 1024));
    } catch {
      diag.separateMount = "unknown";
    }

    // Persistence marker: written once and meant to survive redeploys.
    // If firstBoot stays constant while bootTime changes across deploys, the
    // volume persists. If firstBoot == bootTime after a redeploy, it reset.
    let firstBoot: string;
    if (fs.existsSync(MARKER)) {
      firstBoot = fs.readFileSync(MARKER, "utf8").trim();
      diag.markerSurvivedRestart = firstBoot !== BOOT_TIME;
    } else {
      firstBoot = BOOT_TIME;
      fs.writeFileSync(MARKER, BOOT_TIME);
      diag.markerSurvivedRestart = false; // just created this boot
    }
    diag.firstBoot = firstBoot;

    // Counts that should persist if the volume works.
    diag.screenshotFiles = fs.existsSync(SHOTS_DIR) ? fs.readdirSync(SHOTS_DIR).length : 0;
    diag.audits = getStore().db.audits.length;
  } catch (e) {
    diag.writable = false;
    diag.error = (e as Error).message;
  }
  return diag;
}

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "benchbot",
    realCrawl: env.enableRealCrawl,
    aiEnabled: hasOpenAI(),
    demoMode: env.demoMode,
    bootTime: BOOT_TIME,
    time: new Date().toISOString(),
    storage: storageDiag(),
  });
}
