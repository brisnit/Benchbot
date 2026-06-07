"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Screenshot <img> with a graceful fallback. Real-crawl PNGs can 404 if the
// file was lost (e.g. an unmounted volume after a redeploy); rather than show a
// broken-image icon we render a clean "unavailable" placeholder.
export function ShotImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = React.useState(false);

  if (errored) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-1 bg-secondary text-muted-foreground", className)}>
        <ImageOff className="h-6 w-6" />
        <span className="text-[11px]">Screenshot unavailable</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}
