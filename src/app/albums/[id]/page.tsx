export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { AlbumDetailShell } from "@/components/AlbumDetailShell";
import { Pagination } from "@/components/Pagination";
import { withArchivePage } from "@/lib/archive-layout";
import { getAlbumById, getAlbumPhotosPage } from "@/lib/queries";
import { sanitizeDescription } from "@/lib/sanitize";

export default async function AlbumDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  return withArchivePage(async () => {
    const album = getAlbumById(id);
    if (!album) notFound();

    const { photos, total } = getAlbumPhotosPage(id, page);
    const description = sanitizeDescription(album.description);

    return (
      <>
        <AlbumDetailShell
          albumId={id}
          albumTitle={album.title}
          photoCount={total}
          photos={photos}
          description={description || undefined}
        />
        <Pagination currentPage={page} totalItems={total} basePath={`/albums/${id}`} />
      </>
    );
  }, { fullWidth: true });
}
