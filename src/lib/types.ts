import { z } from "zod";

export const flickrCommentSchema = z.object({
  id: z.string(),
  date: z.string().optional(),
  user: z.string().optional(),
  comment: z.string(),
});

export const flickrTagSchema = z.object({
  tag: z.string(),
  user: z.string().optional(),
  date_create: z.string().optional(),
});

export const flickrPhotoSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  description: z.string().optional().default(""),
  count_views: z.union([z.string(), z.number()]).optional(),
  count_comments: z.union([z.string(), z.number()]).optional(),
  date_taken: z.string().optional(),
  date_imported: z.string().optional(),
  license: z.string().optional(),
  comments: z.array(flickrCommentSchema).optional().default([]),
  tags: z.array(flickrTagSchema).optional().default([]),
});

export const flickrAlbumSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().default(""),
  photo_count: z.union([z.string(), z.number()]).optional(),
  created: z.string().optional(),
  cover_photo: z.string().optional(),
  photos: z.array(z.string()).optional().default([]),
});

export const flickrAlbumsFileSchema = z.object({
  albums: z.array(flickrAlbumSchema),
});

export const flickrAccountSchema = z.object({
  screen_name: z.string().optional().default(""),
  real_name: z.string().optional(),
  path_alias: z.string().optional(),
  description: z.string().optional(),
  join_date: z.string().optional(),
  profile_url: z.string().optional(),
  stats: z.record(z.string(), z.unknown()).optional(),
});

export type FlickrPhoto = z.infer<typeof flickrPhotoSchema>;
export type FlickrAlbum = z.infer<typeof flickrAlbumSchema>;
export type FlickrAccount = z.infer<typeof flickrAccountSchema>;

export type PhotoRow = {
  id: string;
  title: string;
  description: string;
  date_taken: string | null;
  date_imported: string | null;
  media_path: string;
  thumb_path: string | null;
  media_type: string;
  view_count: number;
  comment_count: number;
  license: string | null;
  width: number | null;
  height: number | null;
};

export type AlbumRow = {
  id: string;
  title: string;
  description: string;
  cover_photo_id: string | null;
  photo_count: number;
  created_at: string | null;
};

export type CommentRow = {
  id: string;
  photo_id: string;
  author_nsid: string | null;
  body: string;
  commented_at: string | null;
};

export type AccountRow = {
  id: number;
  screen_name: string;
  real_name: string | null;
  path_alias: string | null;
  description: string | null;
  join_date: string | null;
  profile_url: string | null;
  stats_json: string | null;
};

export const PHOTO_ID_FROM_FILENAME = /_(\d+)_o\.([a-z0-9]+)$/i;
export const PHOTO_ID_PREFIX_FILENAME = /^(\d+)_[a-f0-9]+_o\.([a-z0-9]+)$/i;

export const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "tif", "tiff"]);
export const VIDEO_EXTENSIONS = new Set(["mov", "mp4", "m4v", "avi"]);

export function mediaTypeFromExtension(ext: string): string {
  const lower = ext.toLowerCase();
  if (VIDEO_EXTENSIONS.has(lower)) return "video";
  if (IMAGE_EXTENSIONS.has(lower)) return "image";
  return "other";
}

export function parseCount(value: string | number | undefined): number {
  if (value === undefined) return 0;
  const n = typeof value === "number" ? value : parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

export function extractPhotoIdFromFilename(filename: string): string | null {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const slugMatch = base.match(PHOTO_ID_FROM_FILENAME);
  if (slugMatch?.[1]) return slugMatch[1];
  const prefixMatch = base.match(PHOTO_ID_PREFIX_FILENAME);
  if (prefixMatch?.[1]) return prefixMatch[1];
  const videoMatch = base.match(/_(\d+)\.(mov|mp4|m4v|avi)$/i);
  if (videoMatch?.[1]) return videoMatch[1];
  return null;
}

export function extractCoverPhotoId(coverPhoto: string | undefined): string | null {
  if (!coverPhoto) return null;
  const trailing = coverPhoto.match(/(\d+)\/?$/);
  return trailing?.[1] ?? null;
}
