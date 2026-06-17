export const runtime = "nodejs";

import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CommentList } from "@/components/CommentList";
import { SectionLabel } from "@/components/SectionLabel";
import { TagChip } from "@/components/TagChip";
import { ZoomablePhoto } from "@/components/ZoomablePhoto";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { withArchivePage } from "@/lib/archive-layout";
import { mediaUrl } from "@/lib/media-urls";
import { photoPageHref } from "@/lib/photo-links";
import {
  getAdjacentPhotoIds,
  getAdjacentPhotoIdsInAlbum,
  getAlbumById,
  getPhotoById,
  getPhotoComments,
  getPhotoTags,
} from "@/lib/queries";
import { sanitizeDescription } from "@/lib/sanitize";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr.replace(" ", "T")), "yyyy-MM-dd");
  } catch {
    return dateStr;
  }
}

export default async function PhotoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ album?: string }>;
}) {
  const { id } = await params;
  const { album: albumId } = await searchParams;

  const navBtnClass =
    "inline-flex items-center gap-1.5 rounded border px-3.5 py-2 text-[13px] text-[var(--text-secondary)] no-underline transition-colors hover:border-[var(--border-mid)] hover:text-[var(--text-primary)]";

  return withArchivePage(async () => {
    const photo = getPhotoById(id);
    if (!photo) notFound();

    const album = albumId ? getAlbumById(albumId) : null;
    const albumNav = album ? getAdjacentPhotoIdsInAlbum(album.id, id) : null;
    const useAlbumContext = albumNav !== null && albumNav.index > 0;

    const comments = getPhotoComments(id);
    const tags = getPhotoTags(id);
    const description = sanitizeDescription(photo.description);
    const { prev, next, index, total } = useAlbumContext ? albumNav! : getAdjacentPhotoIds(id);
    const backHref = useAlbumContext ? `/albums/${album!.id}` : "/";
    const backLabel = useAlbumContext ? `Back to ${album!.title}` : "Back to Photostream";
    const linkAlbumId = useAlbumContext ? album!.id : undefined;

    return (
      <div className="grid lg:h-[calc(100vh-var(--nav-h))] lg:grid-cols-[1fr_340px]">
        <div className="flex min-h-0 flex-col">
          <Link
            href={backHref}
            className="inline-flex shrink-0 items-center gap-1.5 px-6 pb-2 pt-5 text-[13px] text-[var(--text-muted)] no-underline transition-colors hover:text-[var(--text-secondary)] md:px-12"
          >
            <ChevronLeftIcon />
            {backLabel}
          </Link>

          <div className="flex min-h-0 flex-1 flex-col px-6 pb-5 md:pl-12 md:pr-8">
            <div className="flex min-h-[55vh] flex-1 items-start justify-center overflow-hidden lg:min-h-0">
              {photo.media_type === "video" ? (
                <video
                  controls
                  className="max-h-full max-w-full object-contain"
                  src={mediaUrl(photo.media_path, "media")}
                />
              ) : (
                <ZoomablePhoto
                  src={mediaUrl(photo.media_path, "media")}
                  alt={photo.title || "Photo"}
                />
              )}
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-between">
            {prev ? (
              <Link href={photoPageHref(prev, linkAlbumId)} className={navBtnClass} style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
                <ChevronLeftIcon />
                Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="font-mono text-xs text-[var(--text-muted)]">
              {index.toLocaleString()} / {total.toLocaleString()}
            </span>
            {next ? (
              <Link href={photoPageHref(next, linkAlbumId)} className={navBtnClass} style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
                Next
                <ChevronRightIcon />
              </Link>
            ) : (
              <span />
            )}
            </div>
          </div>
        </div>

        <aside
          className="flex min-h-0 flex-col gap-7 overflow-y-auto border-t px-6 py-8 lg:border-l lg:border-t-0 md:px-8"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h1 className="font-serif text-[22px] font-normal leading-snug tracking-tight text-[var(--text-primary)]">
              {photo.title || "Untitled"}
            </h1>
            <p className="font-mono mt-2 text-xs text-[var(--text-muted)]">
              {photo.date_taken && <>Taken · {formatDate(photo.date_taken)}</>}
              {photo.date_taken && photo.date_imported && <> &nbsp;·&nbsp; </>}
              {photo.date_imported && <>Uploaded · {formatDate(photo.date_imported)}</>}
            </p>
          </div>

          {description && (
            <div>
              <SectionLabel>Description</SectionLabel>
              <div
                className="prose prose-sm prose-invert max-w-none text-[14px] leading-relaxed text-[var(--text-secondary)]"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          )}

          {tags.length > 0 && (
            <div>
              <SectionLabel>Tags</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <TagChip key={tag} tag={tag} />
                ))}
              </div>
            </div>
          )}

          {(photo.view_count > 0 || photo.license) && (
            <div>
              <SectionLabel>Details</SectionLabel>
              <div className="grid grid-cols-2 gap-2.5">
                {photo.view_count > 0 && (
                  <div className="rounded p-2.5 px-3" style={{ background: "var(--bg-raised)" }}>
                    <div className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Views
                    </div>
                    <div className="font-mono mt-0.5 text-[13px] text-[var(--text-secondary)]">
                      {photo.view_count.toLocaleString()}
                    </div>
                  </div>
                )}
                {photo.license && (
                  <div className="rounded p-2.5 px-3" style={{ background: "var(--bg-raised)" }}>
                    <div className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      License
                    </div>
                    <div className="font-mono mt-0.5 text-[13px] text-[var(--text-secondary)]">
                      {photo.license}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <SectionLabel>
              Comments{" "}
              <span className="normal-case tracking-normal text-xs font-normal text-[var(--text-muted)]">
                {comments.length}
              </span>
            </SectionLabel>
            <CommentList comments={comments} />
          </div>
        </aside>
      </div>
    );
  }, { fullWidth: true });
}
