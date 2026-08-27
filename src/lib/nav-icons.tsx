import type { SiteNavLink } from "./site-config";
import { isExternalNavHref } from "./site-config";
import {
  AlbumIcon,
  BlogIcon,
  ExternalLinkIcon,
  GridIcon,
  SearchIcon,
  UploadIcon,
  UserIcon,
} from "@/components/icons";

export type NavIconComponent = (props: { className?: string }) => React.ReactNode;

/** Allowed `icon` values in NAV_LINKS JSON. */
export const NAV_ICONS: Record<string, NavIconComponent> = {
  grid: GridIcon,
  albums: AlbumIcon,
  user: UserIcon,
  search: SearchIcon,
  upload: UploadIcon,
  blog: BlogIcon,
  external: ExternalLinkIcon,
};

const HREF_ICON_FALLBACK: Record<string, NavIconComponent> = {
  "/": GridIcon,
  "/albums": AlbumIcon,
  "/about": UserIcon,
  "/search": SearchIcon,
  "/import": UploadIcon,
};

export function iconForNavLink(link: SiteNavLink): NavIconComponent {
  if (link.icon && NAV_ICONS[link.icon]) {
    return NAV_ICONS[link.icon];
  }
  if (HREF_ICON_FALLBACK[link.href]) {
    return HREF_ICON_FALLBACK[link.href];
  }
  if (isExternalNavHref(link.href)) {
    return ExternalLinkIcon;
  }
  return GridIcon;
}
