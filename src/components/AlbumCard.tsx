import Link from "next/link";
import { ArchiveImage } from "@/components/ArchiveImage";
import type { AlbumRow, PhotoRow } from "@/lib/types";
import { photoImageSources } from "@/lib/media-urls";

function CoverImage({ photo }: { photo: PhotoRow }) {
  const { src, fallbackSrc } = photoImageSources(photo);
  if (!src) return null;

  return (
    <ArchiveImage
      src={src}
      fallbackSrc={fallbackSrc}
      alt=""
      width={photo.width}
      height={photo.height}
      fill
    />
  );
}

function AlbumCover({ photos }: { photos: PhotoRow[] }) {
  const withThumbs = photos.filter((p) => photoImageSources(p).src);

  if (withThumbs.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]"
        style={{ background: "var(--bg-raised)" }}
      >
        No cover
      </div>
    );
  }

  if (withThumbs.length === 1) {
    return <CoverImage photo={withThumbs[0]} />;
  }

  if (withThumbs.length === 2) {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-0.5">
        {withThumbs.map((photo) => (
          <div key={photo.id} className="overflow-hidden" style={{ background: "var(--bg-raised)" }}>
            <CoverImage photo={photo} />
          </div>
        ))}
      </div>
    );
  }

  if (withThumbs.length === 3) {
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
        <div className="overflow-hidden" style={{ background: "var(--bg-raised)" }}>
          <CoverImage photo={withThumbs[0]} />
        </div>
        <div className="overflow-hidden" style={{ background: "var(--bg-raised)" }}>
          <CoverImage photo={withThumbs[1]} />
        </div>
        <div
          className="col-span-2 overflow-hidden"
          style={{ background: "var(--bg-raised)" }}
        >
          <CoverImage photo={withThumbs[2]} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
      {withThumbs.slice(0, 4).map((photo) => (
        <div key={photo.id} className="overflow-hidden" style={{ background: "var(--bg-raised)" }}>
          <CoverImage photo={photo} />
        </div>
      ))}
    </div>
  );
}

export function AlbumCard({
  album,
  previewPhotos,
}: {
  album: AlbumRow;
  previewPhotos: PhotoRow[];
}) {
  return (
    <Link
      href={`/albums/${album.id}`}
      className="block overflow-hidden border no-underline transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--border-mid)] hover:shadow-[var(--shadow-card)]"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <AlbumCover photos={previewPhotos} />
      </div>
      <div className="px-4 py-3.5">
        <div className="text-sm font-medium text-[var(--text-primary)]">{album.title}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            {album.photo_count} photo{album.photo_count === 1 ? "" : "s"}
          </span>
          {album.created_at && (
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              {album.created_at.slice(0, 10)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
