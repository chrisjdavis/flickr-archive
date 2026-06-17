import { ReactNode } from "react";
import { ArchiveMissing } from "@/components/ArchiveMissing";
import { SiteHeader } from "@/components/SiteHeader";
import { archiveExists } from "@/lib/db";

type WithArchiveOptions = { fullWidth?: boolean };

function ArchiveShell({
  children,
  fullWidth = false,
}: {
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <>
      <SiteHeader />
      <main
        className={`min-h-[calc(100vh-var(--nav-h))] pt-[var(--nav-h)] ${
          fullWidth ? "" : "mx-auto max-w-[1600px]"
        }`}
      >
        {children}
      </main>
    </>
  );
}

export function withArchive(
  children: ReactNode,
  { fullWidth = false }: WithArchiveOptions = {}
) {
  if (!archiveExists()) {
    return <ArchiveMissing />;
  }
  return <ArchiveShell fullWidth={fullWidth}>{children}</ArchiveShell>;
}

export async function withArchivePage(
  render: () => Promise<ReactNode> | ReactNode,
  { fullWidth = false }: WithArchiveOptions = {}
) {
  if (!archiveExists()) {
    return <ArchiveMissing />;
  }
  return <ArchiveShell fullWidth={fullWidth}>{await render()}</ArchiveShell>;
}
