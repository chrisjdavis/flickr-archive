import Link from "next/link";
import { ArchiveImage } from "@/components/ArchiveImage";
import type { PhotoRow } from "@/lib/types";
import { photoImageSources } from "@/lib/media-urls";
import { highlightText } from "@/lib/highlight";
import { stripHtml } from "@/lib/sanitize";

export function SearchResultCard({ photo, query }: { photo: PhotoRow; query: string }) {
  const { src, fallbackSrc } = photoImageSources(photo);
  const title = photo.title || "Untitled";
  const snippet = stripHtml(photo.description).slice(0, 120);

  return (
    <Link
      href={`/photos/${photo.id}`}
      className="block overflow-hidden no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
      style={{ background: "var(--bg-surface)" }}
    >
      {src ? (
        <ArchiveImage
          src={src}
          fallbackSrc={fallbackSrc}
          alt={title}
          width={photo.width}
          height={photo.height}
          defaultAspectRatio="1 / 1"
        />
      ) : (
        <div
          className="flex aspect-square items-center justify-center text-sm text-[var(--text-muted)]"
          style={{ background: "var(--bg-raised)" }}
        >
          Video
        </div>
      )}
      <div className="px-3 py-2.5">
        <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
          {highlightText(title, query)}
        </p>
        {snippet && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
            {highlightText(snippet, query)}
          </p>
        )}
      </div>
    </Link>
  );
}
