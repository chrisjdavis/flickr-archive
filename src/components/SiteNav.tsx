"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlbumIcon,
  CloseIcon,
  GridIcon,
  MenuIcon,
  SearchIcon,
  UploadIcon,
  UserIcon,
} from "./icons";

const NAV_ITEMS = [
  { href: "/", label: "Photostream", icon: GridIcon, match: (p: string) => p === "/" || p.startsWith("/photos/") },
  { href: "/albums", label: "Albums", icon: AlbumIcon, match: (p: string) => p.startsWith("/albums") },
  { href: "/about", label: "About", icon: UserIcon, match: (p: string) => p.startsWith("/about") },
  {
    href: "/import",
    label: "Import",
    icon: UploadIcon,
    match: (p: string) => p.startsWith("/import"),
    importOnly: true as const,
  },
];

const navLinkClass = (active: boolean) =>
  `flex min-h-[44px] items-center gap-1.5 rounded px-3 py-2 text-[13.5px] no-underline transition-colors ${
    active
      ? "bg-[var(--bg-raised)] text-[var(--text-primary)]"
      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
  }`;

export function SiteNav({ showImport = false }: { showImport?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = NAV_ITEMS.filter((item) => !item.importOnly || showImport);

  const openSearch = useCallback(() => {
    router.push("/search");
    setMobileOpen(false);
  }, [router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-50 flex h-[var(--nav-h)] items-center gap-4 border-b border-[var(--border)] bg-[rgba(12,12,14,0.92)] px-4 backdrop-blur-[20px] md:grid md:grid-cols-[1fr_auto_1fr] md:px-8"
        aria-label="Main"
      >
        <Link
          href="/"
          className="flex min-h-[44px] shrink-0 items-center text-[15px] font-medium tracking-tight text-[var(--text-primary)] no-underline"
        >
          My Archive
        </Link>

        <ul className="hidden list-none items-center gap-0.5 md:col-start-2 md:flex">
          {navItems.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link href={href} className={navLinkClass(active)} aria-current={active ? "page" : undefined}>
                  <Icon className={active ? "opacity-100" : "opacity-60"} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-1 md:col-start-3 md:ml-0 md:justify-self-end">
        <button
          type="button"
          onClick={openSearch}
          className="btn-ghost hidden min-h-[44px] items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] text-[var(--text-muted)] transition-colors hover:border-[var(--border-mid)] hover:text-[var(--text-secondary)] md:flex"
          aria-label="Search archive (Command K)"
        >
          <SearchIcon />
          <kbd className="font-mono rounded border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-1.5 py-px text-[11px]">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={openSearch}
          className="touch-target flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] md:hidden"
          aria-label="Search archive"
        >
          <SearchIcon />
        </button>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="touch-target flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        </div>
      </nav>

      {mobileOpen && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-[var(--nav-h)] z-40 border-b border-[var(--border)] bg-[var(--bg-surface)] md:hidden"
        >
          <ul className="list-none p-2">
            {navItems.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 py-3 text-sm no-underline ${
                      active
                        ? "bg-[var(--bg-raised)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon />
                    {label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={openSearch}
                className="flex min-h-[44px] w-full items-center gap-2 rounded-md px-4 py-3 text-left text-sm text-[var(--text-secondary)]"
              >
                <SearchIcon />
                Search
              </button>
            </li>
          </ul>
        </div>
      )}
    </>
  );
}
