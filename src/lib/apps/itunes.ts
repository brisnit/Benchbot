// Apple App Store data via the free iTunes Search/Lookup API (no key required).
// Used to compare native apps' store presence (icons, screenshots, ratings, ASO).

export interface AppInfo {
  id: number;
  name: string;
  developer: string;
  icon: string;
  rating: number;
  ratingCount: number;
  ratingCurrent: number;
  category: string;
  genres: string[];
  price: string;
  free: boolean;
  version: string;
  releaseNotes: string;
  description: string;
  screenshots: string[];
  ipadScreenshots: string[];
  sizeMB: number;
  contentRating: string;
  updated: string;
  url: string;
}

interface ITunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl512?: string;
  artworkUrl100?: string;
  averageUserRating?: number;
  userRatingCount?: number;
  averageUserRatingForCurrentVersion?: number;
  primaryGenreName?: string;
  genres?: string[];
  price?: number;
  formattedPrice?: string;
  version?: string;
  releaseNotes?: string;
  description?: string;
  screenshotUrls?: string[];
  ipadScreenshotUrls?: string[];
  fileSizeBytes?: string;
  contentAdvisoryRating?: string;
  currentVersionReleaseDate?: string;
  trackViewUrl?: string;
}

function mapApp(r: ITunesResult): AppInfo {
  return {
    id: r.trackId,
    name: r.trackName,
    developer: r.artistName,
    icon: r.artworkUrl512 || r.artworkUrl100 || "",
    rating: Math.round((r.averageUserRating ?? 0) * 10) / 10,
    ratingCount: r.userRatingCount ?? 0,
    ratingCurrent: Math.round((r.averageUserRatingForCurrentVersion ?? r.averageUserRating ?? 0) * 10) / 10,
    category: r.primaryGenreName ?? "",
    genres: r.genres ?? [],
    price: r.formattedPrice ?? (r.price ? `$${r.price}` : "Free"),
    free: !r.price,
    version: r.version ?? "",
    releaseNotes: (r.releaseNotes ?? "").slice(0, 600),
    description: (r.description ?? "").slice(0, 1800),
    screenshots: r.screenshotUrls ?? [],
    ipadScreenshots: r.ipadScreenshotUrls ?? [],
    sizeMB: r.fileSizeBytes ? Math.round(Number(r.fileSizeBytes) / 1_000_000) : 0,
    contentRating: r.contentAdvisoryRating ?? "",
    updated: r.currentVersionReleaseDate ?? "",
    url: r.trackViewUrl ?? "",
  };
}

const UA = { "user-agent": "Mozilla/5.0 (compatible; BenchBot/1.0)" };

export async function searchApps(term: string, country = "us", limit = 8): Promise<AppInfo[]> {
  const url = `https://itunes.apple.com/search?media=software&entity=software&country=${encodeURIComponent(country)}&limit=${limit}&term=${encodeURIComponent(term)}`;
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { results: ITunesResult[] };
    return (data.results ?? []).map(mapApp);
  } catch {
    return [];
  }
}

export async function lookupApps(ids: number[], country = "us"): Promise<AppInfo[]> {
  if (!ids.length) return [];
  const url = `https://itunes.apple.com/lookup?country=${encodeURIComponent(country)}&id=${ids.join(",")}`;
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { results: ITunesResult[] };
    const byId = new Map(data.results.filter((r) => r.trackId).map((r) => [r.trackId, mapApp(r)]));
    // preserve requested order
    return ids.map((id) => byId.get(id)).filter((a): a is AppInfo => Boolean(a));
  } catch {
    return [];
  }
}
