import { NextRequest } from "next/server";
import { readScreenshotFile } from "@/lib/crawler/crawl";

// Streams a locally-stored real crawl screenshot. Only used when
// ENABLE_REAL_CRAWL captured PNGs to .data/screenshots.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const buf = readScreenshotFile(name);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
