import { NextRequest } from "next/server";

// Generates a lightweight, branded SVG "screenshot" so the screenshots library
// renders real visuals in demo mode without running a crawler. Deterministic
// per (company, page, device) so cards stay stable across reloads.

function hashHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company = (searchParams.get("company") || "Company").slice(0, 28);
  const host = (searchParams.get("host") || "example.com").slice(0, 40);
  const page = searchParams.get("page") || "homepage";
  const device = searchParams.get("device") || "desktop";

  const hue = hashHue(company);
  const accent = `hsl(${hue} 70% 55%)`;
  const accent2 = `hsl(${(hue + 40) % 360} 70% 60%)`;
  const isMobile = device === "mobile";
  const w = isMobile ? 380 : 720;
  const h = isMobile ? 620 : 460;

  // Simple wireframe-style mock of a webpage hero + blocks.
  const blocks = isMobile
    ? `
      <rect x="24" y="120" width="${w - 48}" height="34" rx="8" fill="#0B1117" opacity="0.9"/>
      <rect x="24" y="166" width="${w - 120}" height="16" rx="6" fill="#647488" opacity="0.4"/>
      <rect x="24" y="190" width="${w - 160}" height="16" rx="6" fill="#647488" opacity="0.3"/>
      <rect x="24" y="230" width="150" height="40" rx="10" fill="${accent}"/>
      <rect x="24" y="300" width="${w - 48}" height="120" rx="12" fill="#F1F4F9"/>
      <rect x="24" y="436" width="${(w - 60) / 2}" height="120" rx="12" fill="#F1F4F9"/>
      <rect x="${36 + (w - 60) / 2}" y="436" width="${(w - 60) / 2}" height="120" rx="12" fill="#F1F4F9"/>
    `
    : `
      <rect x="48" y="150" width="${w * 0.55}" height="44" rx="10" fill="#0B1117" opacity="0.9"/>
      <rect x="48" y="206" width="${w * 0.45}" height="18" rx="6" fill="#647488" opacity="0.4"/>
      <rect x="48" y="232" width="${w * 0.4}" height="18" rx="6" fill="#647488" opacity="0.3"/>
      <rect x="48" y="278" width="160" height="44" rx="10" fill="${accent}"/>
      <rect x="220" y="278" width="140" height="44" rx="10" fill="#fff" stroke="#E4E7EF"/>
      <rect x="${w * 0.62}" y="150" width="${w * 0.3}" height="172" rx="14" fill="url(#g)"/>
      <rect x="48" y="356" width="${(w - 128) / 3}" height="64" rx="12" fill="#F1F4F9"/>
      <rect x="${64 + (w - 128) / 3}" y="356" width="${(w - 128) / 3}" height="64" rx="12" fill="#F1F4F9"/>
      <rect x="${80 + ((w - 128) / 3) * 2}" y="356" width="${(w - 128) / 3}" height="64" rx="12" fill="#F1F4F9"/>
    `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="100%" stop-color="${accent2}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="#fff"/>
    <!-- browser chrome -->
    <rect x="0" y="0" width="${w}" height="56" fill="#0B1117"/>
    <circle cx="24" cy="28" r="5" fill="#F31268"/>
    <circle cx="44" cy="28" r="5" fill="#F5A524"/>
    <circle cx="64" cy="28" r="5" fill="#16C098"/>
    <rect x="92" y="16" width="${w - 132}" height="24" rx="12" fill="#1C2533"/>
    <text x="108" y="32" fill="#8B97A8" font-family="monospace" font-size="12">${host}/${page === "homepage" ? "" : page}</text>
    <!-- nav -->
    <rect x="0" y="56" width="${w}" height="48" fill="#fff"/>
    <circle cx="32" cy="80" r="10" fill="url(#g)"/>
    <rect x="50" y="74" width="80" height="12" rx="6" fill="#0B1117"/>
    ${!isMobile ? `<rect x="${w - 280}" y="74" width="50" height="12" rx="6" fill="#647488" opacity="0.5"/><rect x="${w - 220}" y="74" width="50" height="12" rx="6" fill="#647488" opacity="0.5"/><rect x="${w - 120}" y="70" width="90" height="22" rx="8" fill="${accent}"/>` : `<rect x="${w - 60}" y="72" width="24" height="14" rx="4" fill="#647488" opacity="0.6"/>`}
    <line x1="0" y1="104" x2="${w}" y2="104" stroke="#E4E7EF"/>
    ${blocks}
    <text x="24" y="${h - 18}" fill="#647488" font-family="sans-serif" font-size="11">${company} · ${page} · ${device}</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
