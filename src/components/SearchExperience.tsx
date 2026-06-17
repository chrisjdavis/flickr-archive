"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { PhotoRow } from "@/lib/types";
import type { SearchFilter } from "@/lib/queries";
import { SearchIcon } from "./icons";
import { SearchResultCard } from "./SearchResultCard";
import { SectionLabel } from "./SectionLabel";
import { TagChip } from "./TagChip";

const FILTERS: { id: SearchFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "photos", label: "Photos" },
  { id: "videos", label: "Videos" },
  { id: "tags", label: "Tags" },
];

export function SearchExperience({
  initialQuery,
  initialFilter,
  initialResults,
  popularTags,
}: {
  initialQuery: string;
  initialFilter: SearchFilter;
  initialResults: PhotoRow[];
  popularTags: { tag: string; count: number }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<SearchFilter>(initialFilter);
  const [results, setResults] = useState(initialResults);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setQuery(initialQuery);
    setFilter(initialFilter);
    setResults(initialResults);
  }, [initialQuery, initialFilter, initialResults]);

  const updateUrl = useCallback(
    (q: string, f: SearchFilter) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (f !== "all") params.set("filter", f);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `/search?${qs}` : "/search");
      });
    },
    [router]
  );

  useEffect(() => {
    if (query === initialQuery && filter === initialFilter) return;
    const timer = setTimeout(() => {
      updateUrl(query, filter);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filter, initialQuery, initialFilter, updateUrl]);

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <div className="mx-auto max-w-[680px] px-6 pb-10 pt-16 text-center md:px-12">
        <h1 className="font-serif text-[32px] font-normal tracking-tight text-[var(--text-primary)]">
          Search your archive
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Full-text search across titles, descriptions, and tags
        </p>

        <div className="relative mt-7">
          <label htmlFor="archive-search" className="sr-only">
            Search photos, titles, descriptions, and tags
          </label>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
          <input
            id="archive-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="mountains, tokyo, 2019, sunset…"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-[var(--border-mid)] bg-[var(--bg-surface)] py-3.5 pl-11 pr-4 text-[15px] text-[var(--text-primary)] transition-[border-color,box-shadow] focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)]"
          />
        </div>

        <div
          className="mt-4 flex flex-wrap items-center justify-center gap-2"
          role="group"
          aria-label="Search filters"
        >
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-[12.5px] transition-colors ${
                filter === id
                  ? "border-[rgba(200,169,110,0.35)] bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-mid)] hover:text-[var(--text-primary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {hasQuery ? (
        <>
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 pb-5 md:px-12">
            <p className="text-[13px] text-[var(--text-muted)]">
              Showing <strong className="text-[var(--text-secondary)]">{results.length}</strong> results
              for <strong className="text-[var(--text-secondary)]">&ldquo;{query}&rdquo;</strong>
            </p>
          </div>
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <SearchIcon className="h-10 w-10 text-[var(--text-muted)] opacity-50" />
              <h3 className="text-base font-medium text-[var(--text-secondary)]">No results found</h3>
              <p className="max-w-xs text-[13.5px] text-[var(--text-muted)]">
                Try a different keyword, or browse the Photostream directly.
              </p>
              <Link href="/" className="mt-2 text-sm text-[var(--accent)] no-underline hover:underline">
                Browse Photostream
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 px-6 pb-12 md:px-12">
              {results.map((photo) => (
                <SearchResultCard key={photo.id} photo={photo} query={query} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto max-w-[900px] px-6 pb-12 md:px-12">
          <SectionLabel>Popular tags</SectionLabel>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {popularTags.map(({ tag }) => (
              <TagChip key={tag} tag={tag} onClick={() => setQuery(tag)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
