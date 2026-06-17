export const runtime = "nodejs";

import { ImportExperience } from "@/components/ImportExperience";
import { ImportGate } from "@/components/ImportGate";
import { SiteHeader } from "@/components/SiteHeader";
import { archiveExists } from "@/lib/db";
import { hasImportAccess, isImportEnabled } from "@/lib/import-auth";

export default async function ImportPage() {
  if (!isImportEnabled()) {
    return (
      <>
        <SiteHeader />
        <main className="min-h-[calc(100vh-var(--nav-h))] pt-[var(--nav-h)]">
          <div className="mx-auto max-w-md px-6 py-16 text-center">
            <h1 className="font-serif text-[22px] text-[var(--text-primary)]">Import disabled</h1>
            <p className="mt-3 text-[14px] text-[var(--text-secondary)]">
              Web import is disabled on this server (<code className="font-mono">IMPORT_ENABLED=false</code>
              ). Use the CLI on the host machine if you need to re-import.
            </p>
          </div>
        </main>
      </>
    );
  }

  const authorized = await hasImportAccess();

  return (
    <>
      <SiteHeader />
      <main className="min-h-[calc(100vh-var(--nav-h))] pt-[var(--nav-h)]">
        {authorized ? (
          <ImportExperience initialArchiveExists={archiveExists()} />
        ) : (
          <ImportGate />
        )}
      </main>
    </>
  );
}
