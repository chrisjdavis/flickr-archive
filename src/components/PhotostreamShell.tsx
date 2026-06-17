"use client";

import { useState } from "react";
import type { PhotoRow } from "@/lib/types";
import { PhotoGrid } from "./PhotoGrid";
import { Pagination } from "./Pagination";
import { ViewToggle, type GridColumns } from "./ViewToggle";

export function PhotostreamShell({
  photos,
  total,
  page,
  totalLabel,
}: {
  photos: PhotoRow[];
  total: number;
  page: number;
  totalLabel: string;
}) {
  const [columns, setColumns] = useState<GridColumns>(4);

  return (
    <>
      <header
        className="flex flex-col items-start justify-between gap-4 border-b px-6 pb-8 pt-12 sm:flex-row sm:items-end md:px-12"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <h1 className="font-serif text-[28px] font-normal leading-tight tracking-tight text-[var(--text-primary)]">
            Photostream
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--text-muted)]">
            Showing <strong className="font-medium text-[var(--text-secondary)]">{totalLabel}</strong>, newest
            first
          </p>
        </div>
        <ViewToggle columns={columns} onChange={setColumns} />
      </header>

      <div className="px-6 py-8 md:px-12">
        <PhotoGrid photos={photos} columns={columns} hoverStyle="border" />
      </div>

      <Pagination currentPage={page} totalItems={total} basePath="/" />
    </>
  );
}
