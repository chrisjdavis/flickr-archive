import type Database from "better-sqlite3";
import type { FlickrAccount, FlickrAlbum, FlickrPhoto } from "../lib/types";
import {
  extractCoverPhotoId,
  mediaTypeFromExtension,
  parseCount,
} from "../lib/types";

export type PhotoInsert = {
  photo: FlickrPhoto;
  mediaFilename: string;
  thumbFilename: string | null;
  width: number | null;
  height: number | null;
};

export function writeAccount(db: Database.Database, account: FlickrAccount): void {
  db.prepare(
    `INSERT OR REPLACE INTO account (id, screen_name, real_name, path_alias, description, join_date, profile_url, stats_json)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    account.screen_name ?? "",
    account.real_name ?? null,
    account.path_alias ?? null,
    account.description ?? null,
    account.join_date ?? null,
    account.profile_url ?? null,
    account.stats ? JSON.stringify(account.stats) : null
  );
}

export function writeAlbums(
  db: Database.Database,
  albums: FlickrAlbum[],
  importedPhotoIds: Set<string>
): { albumsImported: number; missingPhotos: { albumId: string; photoId: string }[] } {
  const insertAlbum = db.prepare(
    `INSERT OR REPLACE INTO albums (id, title, description, cover_photo_id, photo_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertAlbumPhoto = db.prepare(
    `INSERT OR REPLACE INTO album_photos (album_id, photo_id, sort_order) VALUES (?, ?, ?)`
  );

  const missingPhotos: { albumId: string; photoId: string }[] = [];

  const writeAll = db.transaction(() => {
    for (const album of albums) {
      const coverId = extractCoverPhotoId(album.cover_photo);
      insertAlbum.run(
        album.id,
        album.title,
        album.description ?? "",
        coverId,
        parseCount(album.photo_count) || album.photos?.length || 0,
        album.created ?? null
      );

      const photos = album.photos ?? [];
      photos.forEach((photoId, index) => {
        if (!importedPhotoIds.has(photoId)) {
          missingPhotos.push({ albumId: album.id, photoId });
          return;
        }
        insertAlbumPhoto.run(album.id, photoId, index);
      });
    }
  });

  writeAll();
  return { albumsImported: albums.length, missingPhotos };
}

export function writePhotos(
  db: Database.Database,
  inserts: PhotoInsert[]
): { commentsImported: number; tagsImported: number } {
  const insertPhoto = db.prepare(
    `INSERT OR REPLACE INTO photos
     (id, title, description, date_taken, date_imported, media_path, thumb_path, media_type, view_count, comment_count, license, width, height)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertTag = db.prepare(
    `INSERT OR REPLACE INTO tags (photo_id, tag) VALUES (?, ?)`
  );
  const insertComment = db.prepare(
    `INSERT OR REPLACE INTO comments (id, photo_id, author_nsid, body, commented_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertFts = db.prepare(
    `INSERT INTO photos_fts (photo_id, title, description, tags) VALUES (?, ?, ?, ?)`
  );

  let commentsImported = 0;
  let tagsImported = 0;

  const writeAll = db.transaction(() => {
    db.exec("DELETE FROM photos_fts");

    for (const { photo, mediaFilename, thumbFilename, width, height } of inserts) {
      const ext = mediaFilename.split(".").pop() ?? "";
      const mediaType = mediaTypeFromExtension(ext);

      insertPhoto.run(
        photo.id,
        photo.name ?? "",
        photo.description ?? "",
        photo.date_taken ?? null,
        photo.date_imported ?? null,
        mediaFilename,
        thumbFilename,
        mediaType,
        parseCount(photo.count_views),
        parseCount(photo.count_comments),
        photo.license ?? null,
        width,
        height
      );

      const tagNames = (photo.tags ?? []).map((t) => t.tag).filter(Boolean);
      for (const tag of tagNames) {
        insertTag.run(photo.id, tag);
        tagsImported++;
      }

      for (const comment of photo.comments ?? []) {
        insertComment.run(
          comment.id,
          photo.id,
          comment.user ?? null,
          comment.comment,
          comment.date ?? null
        );
        commentsImported++;
      }

      insertFts.run(
        photo.id,
        photo.name ?? "",
        photo.description ?? "",
        tagNames.join(" ")
      );
    }
  });

  writeAll();
  return { commentsImported, tagsImported };
}

export function clearDatabase(db: Database.Database): void {
  db.exec(`
    DELETE FROM comments;
    DELETE FROM tags;
    DELETE FROM album_photos;
    DELETE FROM albums;
    DELETE FROM photos;
    DELETE FROM account;
    DELETE FROM photos_fts;
  `);
}
