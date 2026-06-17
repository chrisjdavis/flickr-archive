import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArchiveImage } from "@/components/ArchiveImage";
import type { PhotoRow } from "@/lib/types";
import { photoImageSources } from "@/lib/media-urls";
import { photoPageHref } from "@/lib/photo-links";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr.replace(" ", "T")), "yyyy-MM-dd");
  } catch {
    return dateStr;
  }
}

export function PhotoCard({
  photo,
  showMeta = true,
  albumId,
  hoverStyle = "animated",
}: {
  photo: PhotoRow;
  showMeta?: boolean;
  albumId?: string;
  hoverStyle?: "animated" | "border";
}) {
  const { src, fallbackSrc } = photoImageSources(photo);
  const title = photo.title || "Untitled";

  const cardClass =
    hoverStyle === "border"
      ? "photo-card-border mb-3 block break-inside-avoid overflow-hidden no-underline"
      : "photo-card group mb-3 block break-inside-avoid overflow-hidden no-underline";

  return (
    <Link
      href={photoPageHref(photo.id, albumId)}
      className={cardClass}
      style={{ background: "var(--bg-surface)" }}
    >
      {src ? (
        <ArchiveImage
          src={src}
          fallbackSrc={fallbackSrc}
          alt={title}
          width={photo.width}
          height={photo.height}
          className={hoverStyle === "border" ? "" : "photo-card-media"}
        />
      ) : (
        <div
          className="flex aspect-video items-center justify-center text-sm text-[var(--text-muted)]"
          style={{ background: "var(--bg-raised)" }}
        >
          Video
        </div>
      )}
      {showMeta && (
        <div className="px-3 py-2.5">
          <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{title}</p>
          <p className="font-mono mt-0.5 text-[11.5px] text-[var(--text-muted)]">
            {formatDate(photo.date_taken)}
          </p>
        </div>
      )}
    </Link>
  );
}
