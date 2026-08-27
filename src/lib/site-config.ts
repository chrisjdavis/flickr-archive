import { isSafeHttpUrl } from "./url-safe";

/** Allowed `icon` values in NAV_LINKS JSON. */
export const NAV_ICON_NAMES = [
  "grid",
  "albums",
  "user",
  "search",
  "upload",
  "blog",
  "external",
] as const;

export type NavIconName = (typeof NAV_ICON_NAMES)[number];

export type SiteNavLink = {
  href: string;
  label: string;
  icon?: NavIconName;
};

export const DEFAULT_SITE_NAME = "My Archive";

export const DEFAULT_NAV_LINKS: SiteNavLink[] = [
  { href: "/", label: "Photostream", icon: "grid" },
  { href: "/albums", label: "Albums", icon: "albums" },
  { href: "/about", label: "About", icon: "user" },
];

function envFirst(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getSiteName(): string {
  return envFirst("SITE_NAME", "NEXT_PUBLIC_SITE_NAME") ?? DEFAULT_SITE_NAME;
}

function isSafeInternalHref(href: string): boolean {
  if (!href.startsWith("/")) return false;
  if (href.startsWith("//")) return false;
  if (href.includes("\\") || href.includes("..")) return false;
  return true;
}

export function isExternalNavHref(href: string): boolean {
  return isSafeHttpUrl(href);
}

function parseNavIcon(value: unknown): NavIconName | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.trim().toLowerCase();
  return (NAV_ICON_NAMES as readonly string[]).includes(name) ? (name as NavIconName) : undefined;
}

export function parseNavLinks(raw: string | undefined): SiteNavLink[] | null {
  if (!raw?.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;

    const links: SiteNavLink[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const href = typeof (item as { href?: unknown }).href === "string"
        ? (item as { href: string }).href.trim()
        : "";
      const label = typeof (item as { label?: unknown }).label === "string"
        ? (item as { label: string }).label.trim()
        : "";
      if (!href || !label) continue;
      if (!isSafeInternalHref(href) && !isSafeHttpUrl(href)) continue;
      // Import stays gated by auth; ignore it in the public nav array.
      if (href === "/import" || href.startsWith("/import/")) continue;
      const icon = parseNavIcon((item as { icon?: unknown }).icon);
      links.push(icon ? { href, label, icon } : { href, label });
    }

    return links.length > 0 ? links : null;
  } catch {
    return null;
  }
}

export function getNavLinks(): SiteNavLink[] {
  const raw = envFirst("NAV_LINKS", "NEXT_PUBLIC_NAV_LINKS");
  return parseNavLinks(raw) ?? DEFAULT_NAV_LINKS;
}

export function navLinkIsActive(pathname: string, href: string): boolean {
  if (isExternalNavHref(href)) return false;
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/photos/");
  }
  if (href === "/albums") {
    return pathname.startsWith("/albums");
  }
  if (href === "/about") {
    return pathname.startsWith("/about");
  }
  if (href === "/search") {
    return pathname.startsWith("/search");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
