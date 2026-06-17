import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { shouldShowImportNav } from "@/lib/import-auth";

export async function ArchiveMissing() {
  const showImport = await shouldShowImportNav();

  return (
    <>
      <SiteHeader />
      <main className="min-h-[calc(100vh-var(--nav-h))] pt-[var(--nav-h)]">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h1 className="font-serif text-2xl font-normal text-[var(--text-primary)]">
            Archive not imported
          </h1>
          <p className="mt-4 text-[var(--text-secondary)]">
            {showImport
              ? "Import your Flickr export to start browsing photos, albums, and search."
              : "This archive has not been set up yet."}
          </p>
          {showImport ? (
            <Link
              href="/import"
              className="btn-accent mt-8 inline-flex min-h-[44px] items-center rounded-lg border px-5 py-2.5 text-[13px] font-medium no-underline"
            >
              Import archive
            </Link>
          ) : null}
          <p className="mt-6 text-sm text-[var(--text-muted)]">
            {showImport ? "Or use the CLI: " : "Import on the server with: "}
            <code className="rounded px-1" style={{ background: "var(--bg-surface)" }}>
              npm run import -- /path/to/flickr-export
            </code>
          </p>
        </div>
      </main>
    </>
  );
}

export function ArchiveError({ message }: { message: string }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[calc(100vh-var(--nav-h))] pt-[var(--nav-h)]">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h1 className="font-serif text-2xl font-normal text-[var(--text-primary)]">Archive error</h1>
          <p className="mt-4 text-[var(--text-secondary)]">{message}</p>
          <Link href="/" className="mt-6 inline-block text-sm text-[var(--accent)] underline">
            Back home
          </Link>
        </div>
      </main>
    </>
  );
}
