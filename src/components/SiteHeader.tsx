import { SiteNav } from "./SiteNav";
import { shouldShowImportNav } from "@/lib/import-auth";

export async function SiteHeader() {
  const showImport = await shouldShowImportNav();
  return <SiteNav showImport={showImport} />;
}
