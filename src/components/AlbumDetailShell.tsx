"use client";

import { useState } from "react";
import type { PhotoRow } from "@/lib/types";
import Link from "next/link";
import { ChevronLeftIcon } from "./icons";
import { PhotoGrid } from "./PhotoGrid";
import { ViewToggle, type GridColumns } from "./ViewToggle";

export function AlbumDetailShell({
  albumId,
  albumTitle,
  photoCount,
  photos,
  description,
}: {
  albumId: string;
  albumTitle: string;
  photoCount: number;
  photos: PhotoRow[];
  description?: string;
}) {
  const [columns, setColumns] = useState<GridColumns>(4);

  return (
    <>
      <Link
        href="/albums"
        className="inline-flex items-center gap-1.5 px-6 pt-6 text-[13px] text-[var(--text-muted)] no-underline transition-colors hover:text-[var(--text-secondary)] md:px-12"
      >
        <ChevronLeftIcon />
        All Albums
      </Link>

      <header
        className="flex flex-col items-start justify-between gap-4 border-b px-6 pb-7 pt-4 sm:flex-row sm:items-end md:px-12"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl font-normal tracking-tight text-[var(--text-primary)]">
            {albumTitle}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            {photoCount} photo{photoCount === 1 ? "" : "s"}
          </p>
          {description && (
            <div
              className="prose prose-sm prose-invert mt-4 max-w-2xl text-[var(--text-secondary)]"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}
        </div>
        <ViewToggle columns={columns} onChange={setColumns} />
      </header>

      <div className="px-6 py-8 md:px-12">
        <PhotoGrid photos={photos} columns={columns} albumId={albumId} hoverStyle="border" />
      </div>
    </>
  );
}
