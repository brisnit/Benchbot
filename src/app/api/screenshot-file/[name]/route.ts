import { NextRequest } from "next/server";
import { readScreenshotFile } from "@/lib/crawler/crawl";

// Streams a locally-stored real crawl screenshot. If the file is missing
// (e.g. it was captured before a redeploy and the persistent volume wasn't
// mounted, or the page failed mid-capture) we return a clean "unavailable"
// placeholder image instead of an error page, so links never 404 visibly.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const buf = readScreenshotFile(name);

  if (buf) {
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  return new Response(UNAVAILABLE_SVG, {
    // 200 so the image renders cleanly everywhere (direct link, download, <img>).
    headers: {
      "Content-Type": "image/svg+xml",
      // Don't cache the placeholder — the real file may reappear on re-run.
      "Cache-Control": "no-store",
    },
  });
}

const UNAVAILABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <rect width="800" height="500" fill="#F6F7FB"/>
  <rect x="0" y="0" width="800" height="44" fill="#0B1117"/>
  <circle cx="24" cy="22" r="5" fill="#F31268"/>
  <circle cx="44" cy="22" r="5" fill="#F5A524"/>
  <circle cx="64" cy="22" r="5" fill="#16C098"/>
  <g transform="translate(400 250)" text-anchor="middle">
    <rect x="-34" y="-78" width="68" height="56" rx="10" fill="none" stroke="#CBD5E1" stroke-width="3"/>
    <circle cx="-14" cy="-58" r="7" fill="#CBD5E1"/>
    <path d="M-30 -28 L-6 -50 L8 -38 L30 -60 L30 -26 Z" fill="#CBD5E1"/>
    <line x1="-40" y1="-84" x2="40" y2="-16" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"/>
    <text y="6" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="600" fill="#647488">Screenshot unavailable</text>
    <text y="34" font-family="Inter, system-ui, sans-serif" font-size="14" fill="#94A3B8">Re-run the audit to recapture this page.</text>
  </g>
</svg>`;
