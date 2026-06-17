"use client";

import { useEffect, useState } from "react";
import type { PhotoRow } from "@/lib/types";
import { PhotoCard } from "./PhotoCard";
import type { GridColumns } from "./ViewToggle";

const STORAGE_KEY = "flickr-archive-grid-cols";

export function PhotoGrid({
  photos,
  columns: controlledColumns,
  showMeta = true,
  albumId,
  hoverStyle = "animated",
}: {
  photos: PhotoRow[];
  columns?: GridColumns;
  showMeta?: boolean;
  albumId?: string;
  hoverStyle?: "animated" | "border";
}) {
  const [internalColumns, setInternalColumns] = useState<GridColumns>(4);
  const columns = controlledColumns ?? internalColumns;

  useEffect(() => {
    if (controlledColumns !== undefined) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "3" || stored === "4" || stored === "5") {
        setInternalColumns(Number(stored) as GridColumns);
      }
    } catch {
      /* ignore */
    }
  }, [controlledColumns]);

  useEffect(() => {
    if (controlledColumns !== undefined) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(internalColumns));
    } catch {
      /* ignore */
    }
  }, [internalColumns, controlledColumns]);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[var(--text-muted)] opacity-50"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <h3 className="text-base font-medium text-[var(--text-secondary)]">No photos found</h3>
        <p className="max-w-xs text-[13.5px] text-[var(--text-muted)]">
          Try a different search, or browse the Photostream directly.
        </p>
      </div>
    );
  }

  const colClass = columns === 3 ? "cols-3" : columns === 5 ? "cols-5" : "";

  return (
    <div className={`photo-grid ${colClass}`}>
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} showMeta={showMeta} albumId={albumId} hoverStyle={hoverStyle} />
      ))}
    </div>
  );
}

export { ViewToggle } from "./ViewToggle";
export type { GridColumns } from "./ViewToggle";
