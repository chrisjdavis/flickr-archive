import Link from "next/link";
import { PHOTOS_PER_PAGE } from "@/lib/constants";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

function pageHref(basePath: string, page: number, query?: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query) params.set("q", query);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function buildPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function Pagination({
  currentPage,
  totalItems,
  basePath,
  query = "",
}: {
  currentPage: number;
  totalItems: number;
  basePath: string;
  query?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PHOTOS_PER_PAGE));
  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(currentPage, totalPages);
  const btnBase =
    "flex h-11 min-w-11 items-center justify-center rounded border px-2.5 text-[13px] transition-colors";
  const btnIdle =
    "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-mid)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]";

  return (
    <div className="flex items-center justify-center gap-1.5 border-t border-[var(--border)] py-10">
      {currentPage > 1 ? (
        <Link
          href={pageHref(basePath, currentPage - 1, query || undefined)}
          className={`${btnBase} ${btnIdle}`}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </Link>
      ) : (
        <span
          className={`${btnBase} ${btnIdle} cursor-not-allowed opacity-30`}
          aria-hidden
        >
          <ChevronLeftIcon />
        </span>
      )}

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="px-1 text-[13px] text-[var(--text-muted)]">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={pageHref(basePath, p, query || undefined)}
            className={`${btnBase} ${
              p === currentPage
                ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-[#0c0c0e]"
                : btnIdle
            }`}
            aria-label={`Page ${p}`}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link
          href={pageHref(basePath, currentPage + 1, query || undefined)}
          className={`${btnBase} ${btnIdle}`}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Link>
      ) : (
        <span
          className={`${btnBase} ${btnIdle} cursor-not-allowed opacity-30`}
          aria-hidden
        >
          <ChevronRightIcon />
        </span>
      )}
    </div>
  );
}
