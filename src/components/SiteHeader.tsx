import { SiteNav } from "./SiteNav";
import { shouldShowImportNav } from "@/lib/import-auth";
import { getNavLinks, getSiteName } from "@/lib/site-config";

export async function SiteHeader() {
  const showImport = await shouldShowImportNav();
  return (
    <SiteNav
      showImport={showImport}
      siteName={getSiteName()}
      navLinks={getNavLinks()}
    />
  );
}
