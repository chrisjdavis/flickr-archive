import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_NAV_LINKS,
  DEFAULT_SITE_NAME,
  getNavLinks,
  getSiteName,
  navLinkIsActive,
  parseNavLinks,
} from "./site-config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteName", () => {
  it("defaults to My Archive", () => {
    delete process.env.SITE_NAME;
    delete process.env.NEXT_PUBLIC_SITE_NAME;
    expect(getSiteName()).toBe(DEFAULT_SITE_NAME);
  });

  it("uses SITE_NAME when set", () => {
    vi.stubEnv("SITE_NAME", "Chris Photos");
    expect(getSiteName()).toBe("Chris Photos");
  });
});

describe("parseNavLinks / getNavLinks", () => {
  it("returns defaults when unset", () => {
    delete process.env.NAV_LINKS;
    delete process.env.NEXT_PUBLIC_NAV_LINKS;
    expect(getNavLinks()).toEqual(DEFAULT_NAV_LINKS);
  });

  it("parses a custom nav array with icons", () => {
    const links = parseNavLinks(
      JSON.stringify([
        { href: "/", label: "Home", icon: "grid" },
        { href: "/albums", label: "Sets", icon: "albums" },
        { href: "https://example.com", label: "Blog", icon: "external" },
      ])
    );
    expect(links).toEqual([
      { href: "/", label: "Home", icon: "grid" },
      { href: "/albums", label: "Sets", icon: "albums" },
      { href: "https://example.com", label: "Blog", icon: "external" },
    ]);
  });

  it("ignores unknown icon names", () => {
    const links = parseNavLinks(
      JSON.stringify([{ href: "/about", label: "About", icon: "not-real" }])
    );
    expect(links).toEqual([{ href: "/about", label: "About" }]);
  });

  it("rejects unsafe hrefs and drops /import", () => {
    const links = parseNavLinks(
      JSON.stringify([
        { href: "/about", label: "About" },
        { href: "/import", label: "Import" },
        { href: "javascript:alert(1)", label: "Nope" },
        { href: "../etc/passwd", label: "Nope" },
      ])
    );
    expect(links).toEqual([{ href: "/about", label: "About" }]);
  });

  it("falls back to defaults on invalid JSON", () => {
    vi.stubEnv("NAV_LINKS", "not-json");
    expect(getNavLinks()).toEqual(DEFAULT_NAV_LINKS);
  });
});

describe("navLinkIsActive", () => {
  it("treats /photos as photostream", () => {
    expect(navLinkIsActive("/photos/123", "/")).toBe(true);
    expect(navLinkIsActive("/albums", "/")).toBe(false);
  });

  it("does not mark external links active", () => {
    expect(navLinkIsActive("/", "https://example.com")).toBe(false);
  });
});
