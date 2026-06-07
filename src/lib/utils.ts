import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize a user-entered URL into a canonical absolute https URL.
 * Accepts "acme.com", "www.acme.com", "http://acme.com/path", etc.
 * Returns null when it cannot be turned into something host-like.
 */
export function normalizeUrl(input: string): string | null {
  if (!input) return null;
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const url = new URL(raw);
    if (!url.hostname.includes(".")) return null;
    url.hash = "";
    // strip trailing slash on root
    let out = url.toString();
    if (url.pathname === "/" && !url.search) out = `${url.protocol}//${url.host}`;
    return out;
  } catch {
    return null;
  }
}

/** Pull a clean brand-ish name from a URL host: "https://www.acme.io" -> "Acme" */
export function nameFromUrl(input: string): string {
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    const host = url.hostname.replace(/^www\./, "");
    const base = host.split(".")[0] ?? host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return input;
  }
}

export function hostFromUrl(input: string): string {
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return input;
  }
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Deterministic id (no external deps). */
export function uid(prefix = ""): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}${time}${rand}`;
}

/** Clamp + round a score into 0-100. */
export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Map a 0-100 score to a semantic band. */
export function scoreBand(score: number): "good" | "warn" | "critical" {
  if (score >= 75) return "good";
  if (score >= 50) return "warn";
  return "critical";
}
