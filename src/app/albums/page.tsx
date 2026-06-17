export const runtime = "nodejs";

import { AlbumCard } from "@/components/AlbumCard";
import { AlbumIcon } from "@/components/icons";
import { withArchivePage } from "@/lib/archive-layout";
import { getAlbumPreviewPhotos, getAlbums, getTotalPhotoCount } from "@/lib/queries";

export default async function AlbumsPage() {
  return withArchivePage(async () => {
    const albums = getAlbums();
    const totalPhotos = getTotalPhotoCount();

    return (
      <>
        <header
          className="border-b px-6 pb-8 pt-12 md:px-12"
          style={{ borderColor: "var(--border)" }}
        >
          <h1 className="font-serif text-[28px] font-normal tracking-tight text-[var(--text-primary)]">
            Albums
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--text-muted)]">
            {albums.length} albums · {totalPhotos.toLocaleString()} photos total
          </p>
        </header>

        {albums.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center md:px-12">
            <AlbumIcon className="h-10 w-10 text-[var(--text-muted)] opacity-50" />
            <h2 className="text-base font-medium text-[var(--text-secondary)]">No albums yet</h2>
            <p className="max-w-sm text-[13.5px] text-[var(--text-muted)]">
              Albums from your Flickr export will appear here after import.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 px-6 py-8 md:px-12">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                previewPhotos={getAlbumPreviewPhotos(album.id, 4)}
              />
            ))}
          </div>
        )}
      </>
    );
  }, { fullWidth: true });
}
