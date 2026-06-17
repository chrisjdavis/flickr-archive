import type { AccountRow, AlbumRow, CommentRow, PhotoRow } from "./types";
import { getDb } from "./db";
import { PHOTOS_PER_PAGE } from "./constants";

export { PHOTOS_PER_PAGE };

export function getAccount(): AccountRow | null {
  const db = getDb();
  return db.prepare("SELECT * FROM account WHERE id = 1").get() as AccountRow | undefined ?? null;
}

export function getPhotosPage(page: number): { photos: PhotoRow[]; total: number } {
  const db = getDb();
  const offset = (page - 1) * PHOTOS_PER_PAGE;
  const total = (db.prepare("SELECT COUNT(*) as count FROM photos").get() as { count: number }).count;
  const photos = db
    .prepare(
      `SELECT * FROM photos ORDER BY date_taken DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(PHOTOS_PER_PAGE, offset) as PhotoRow[];
  return { photos, total };
}

export function getPhotoById(id: string): PhotoRow | null {
  const db = getDb();
  return db.prepare("SELECT * FROM photos WHERE id = ?").get(id) as PhotoRow | undefined ?? null;
}

export function getPhotoComments(photoId: string): CommentRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM comments WHERE photo_id = ? ORDER BY commented_at ASC, id ASC`
    )
    .all(photoId) as CommentRow[];
}

export function getPhotoTags(photoId: string): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT tag FROM tags WHERE photo_id = ? ORDER BY tag ASC")
    .all(photoId) as { tag: string }[];
  return rows.map((r) => r.tag);
}

export function getAlbums(): AlbumRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM albums ORDER BY title ASC")
    .all() as AlbumRow[];
}

export function getAlbumById(id: string): AlbumRow | null {
  const db = getDb();
  return db.prepare("SELECT * FROM albums WHERE id = ?").get(id) as AlbumRow | undefined ?? null;
}

export function getAlbumPhotos(albumId: string): PhotoRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.* FROM photos p
       INNER JOIN album_photos ap ON ap.photo_id = p.id
       WHERE ap.album_id = ?
       ORDER BY ap.sort_order ASC`
    )
    .all(albumId) as PhotoRow[];
}

export function getAlbumPhotosPage(
  albumId: string,
  page: number
): { photos: PhotoRow[]; total: number } {
  const db = getDb();
  const total = (
    db
      .prepare("SELECT COUNT(*) as count FROM album_photos WHERE album_id = ?")
      .get(albumId) as { count: number }
  ).count;
  const offset = (page - 1) * PHOTOS_PER_PAGE;
  const photos = db
    .prepare(
      `SELECT p.* FROM photos p
       INNER JOIN album_photos ap ON ap.photo_id = p.id
       WHERE ap.album_id = ?
       ORDER BY ap.sort_order ASC
       LIMIT ? OFFSET ?`
    )
    .all(albumId, PHOTOS_PER_PAGE, offset) as PhotoRow[];
  return { photos, total };
}

export type SearchFilter = "all" | "photos" | "videos" | "tags";

export function searchPhotos(query: string, filter: SearchFilter = "all"): PhotoRow[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const db = getDb();

  if (filter === "tags") {
    const like = `%${trimmed.toLowerCase()}%`;
    return db
      .prepare(
        `SELECT DISTINCT p.* FROM photos p
         INNER JOIN tags t ON t.photo_id = p.id
         WHERE LOWER(t.tag) LIKE ?
         ORDER BY p.date_taken DESC, p.id DESC
         LIMIT 200`
      )
      .all(like) as PhotoRow[];
  }

  const ftsQuery = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"*`)
    .join(" ");

  const mediaClause =
    filter === "photos"
      ? "AND p.media_type = 'image'"
      : filter === "videos"
        ? "AND p.media_type = 'video'"
        : "";

  try {
    return db
      .prepare(
        `SELECT p.* FROM photos p
         INNER JOIN photos_fts fts ON fts.photo_id = p.id
         WHERE photos_fts MATCH ? ${mediaClause}
         ORDER BY p.date_taken DESC, p.id DESC
         LIMIT 200`
      )
      .all(ftsQuery) as PhotoRow[];
  } catch {
    return [];
  }
}

export function getTotalPhotoCount(): number {
  const db = getDb();
  return (db.prepare("SELECT COUNT(*) as count FROM photos").get() as { count: number }).count;
}

export function getPopularTags(limit = 12): { tag: string; count: number }[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT tag, COUNT(*) as count FROM tags
       GROUP BY tag ORDER BY count DESC, tag ASC LIMIT ?`
    )
    .all(limit) as { tag: string; count: number }[];
}

export function getAdjacentPhotoIds(currentId: string): {
  prev: string | null;
  next: string | null;
  index: number;
  total: number;
} {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as count FROM photos").get() as { count: number }).count;
  if (total === 0) {
    return { prev: null, next: null, index: 0, total: 0 };
  }

  const indexRow = db
    .prepare(
      `SELECT COUNT(*) + 1 AS idx
       FROM photos
       WHERE (date_taken, id) > (
         SELECT date_taken, id FROM photos WHERE id = ?
       )`
    )
    .get(currentId) as { idx: number } | undefined;

  const index = indexRow?.idx ?? 0;
  if (index === 0) {
    return { prev: null, next: null, index: 0, total };
  }

  const prev = db
    .prepare(
      `SELECT id FROM photos
       WHERE (date_taken, id) < (SELECT date_taken, id FROM photos WHERE id = ?)
       ORDER BY date_taken DESC, id DESC
       LIMIT 1`
    )
    .get(currentId) as { id: string } | undefined;

  const next = db
    .prepare(
      `SELECT id FROM photos
       WHERE (date_taken, id) > (SELECT date_taken, id FROM photos WHERE id = ?)
       ORDER BY date_taken ASC, id ASC
       LIMIT 1`
    )
    .get(currentId) as { id: string } | undefined;

  return {
    prev: prev?.id ?? null,
    next: next?.id ?? null,
    index,
    total,
  };
}

export function getAdjacentPhotoIdsInAlbum(
  albumId: string,
  currentId: string
): {
  prev: string | null;
  next: string | null;
  index: number;
  total: number;
} {
  const db = getDb();
  const total = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM album_photos WHERE album_id = ?`
      )
      .get(albumId) as { count: number }
  ).count;

  if (total === 0) {
    return { prev: null, next: null, index: 0, total: 0 };
  }

  const current = db
    .prepare(
      `SELECT sort_order FROM album_photos WHERE album_id = ? AND photo_id = ?`
    )
    .get(albumId, currentId) as { sort_order: number } | undefined;

  if (!current) {
    return { prev: null, next: null, index: 0, total };
  }

  const index = (
    db
      .prepare(
        `SELECT COUNT(*) + 1 AS idx FROM album_photos
         WHERE album_id = ? AND sort_order < ?`
      )
      .get(albumId, current.sort_order) as { idx: number }
  ).idx;

  const prev = db
    .prepare(
      `SELECT photo_id AS id FROM album_photos
       WHERE album_id = ? AND sort_order < ?
       ORDER BY sort_order DESC
       LIMIT 1`
    )
    .get(albumId, current.sort_order) as { id: string } | undefined;

  const next = db
    .prepare(
      `SELECT photo_id AS id FROM album_photos
       WHERE album_id = ? AND sort_order > ?
       ORDER BY sort_order ASC
       LIMIT 1`
    )
    .get(albumId, current.sort_order) as { id: string } | undefined;

  return {
    prev: prev?.id ?? null,
    next: next?.id ?? null,
    index,
    total,
  };
}

export function getAlbumPreviewPhotos(albumId: string, limit = 4): PhotoRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.* FROM photos p
       INNER JOIN album_photos ap ON ap.photo_id = p.id
       WHERE ap.album_id = ?
       ORDER BY ap.sort_order ASC
       LIMIT ?`
    )
    .all(albumId, limit) as PhotoRow[];
}

export type ArchiveStats = {
  totalPhotos: number;
  totalVideos: number;
  totalAlbums: number;
  totalComments: number;
  uniqueTags: number;
  earliestPhoto: string | null;
  latestPhoto: string | null;
};

export function getArchiveStats(): ArchiveStats {
  const db = getDb();
  const totalPhotos = (db.prepare("SELECT COUNT(*) as count FROM photos").get() as { count: number }).count;
  const totalVideos = (
    db.prepare("SELECT COUNT(*) as count FROM photos WHERE media_type = 'video'").get() as { count: number }
  ).count;
  const totalAlbums = (db.prepare("SELECT COUNT(*) as count FROM albums").get() as { count: number }).count;
  const totalComments = (db.prepare("SELECT COUNT(*) as count FROM comments").get() as { count: number }).count;
  const uniqueTags = (db.prepare("SELECT COUNT(DISTINCT tag) as count FROM tags").get() as { count: number }).count;
  const earliest = db.prepare("SELECT MIN(date_taken) as d FROM photos").get() as { d: string | null };
  const latest = db.prepare("SELECT MAX(date_taken) as d FROM photos").get() as { d: string | null };

  return {
    totalPhotos,
    totalVideos,
    totalAlbums,
    totalComments,
    uniqueTags,
    earliestPhoto: earliest.d,
    latestPhoto: latest.d,
  };
}
