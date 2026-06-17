"use client";

import { useEffect, useRef, useState } from "react";

type ArchiveImageProps = {
  src: string;
  alt: string;
  width?: number | null;
  height?: number | null;
  className?: string;
  /** Fallback if primary src fails (e.g. missing thumbnail). */
  fallbackSrc?: string;
  /** When set, parent controls size (e.g. album grid cells). */
  fill?: boolean;
  /** Used when width/height are unknown. */
  defaultAspectRatio?: string;
};

function markLoaded(img: HTMLImageElement | null): boolean {
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export function ArchiveImage({
  src,
  alt,
  width,
  height,
  className = "",
  fallbackSrc,
  fill = false,
  defaultAspectRatio = "4 / 3",
}: ArchiveImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [activeSrc, setActiveSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setActiveSrc(src);
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (markLoaded(imgRef.current)) {
      setLoaded(true);
    }
  }, [activeSrc]);

  const aspectRatio =
    width && height && width > 0 && height > 0 ? `${width} / ${height}` : defaultAspectRatio;

  const handleLoad = () => setLoaded(true);

  const handleError = () => {
    if (fallbackSrc && activeSrc !== fallbackSrc) {
      setActiveSrc(fallbackSrc);
      setLoaded(false);
      return;
    }
    setFailed(true);
  };

  const skeleton = !loaded && !failed && (
    <div
      className="absolute inset-0 animate-pulse"
      style={{ background: "var(--bg-hover)" }}
      aria-hidden
    />
  );

  const failedLabel = failed && (
    <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-muted)]">
      Unavailable
    </div>
  );

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={activeSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      className={
        fill
          ? `absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`
          : `block w-full transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`
      }
    />
  );

  if (fill) {
    return (
      <div className="relative h-full w-full" style={{ background: "var(--bg-raised)" }}>
        {skeleton}
        {failedLabel}
        {img}
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio, background: "var(--bg-raised)" }}
    >
      {skeleton}
      {failedLabel}
      {img}
    </div>
  );
}
