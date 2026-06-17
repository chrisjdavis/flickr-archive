export function mediaUrl(relativePath: string, kind: "media" | "thumbs" = "media"): string {
  const safe = relativePath.replace(/\\/g, "/");
  const encoded = safe
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/api/media/${kind}/${encoded}`;
}

export function photoThumbUrl(photo: {
  thumb_path: string | null;
  media_path: string;
  media_type: string;
}): string {
  if (photo.thumb_path) {
    return mediaUrl(photo.thumb_path, "thumbs");
  }
  if (photo.media_type === "image") {
    return mediaUrl(photo.media_path, "media");
  }
  return "";
}

export function photoFullUrl(photo: { media_path: string; media_type: string }): string {
  if (photo.media_type === "image") {
    return mediaUrl(photo.media_path, "media");
  }
  return "";
}

export function photoImageSources(photo: {
  thumb_path: string | null;
  media_path: string;
  media_type: string;
}): { src: string; fallbackSrc?: string } {
  const thumb = photo.thumb_path ? mediaUrl(photo.thumb_path, "thumbs") : null;
  const full = photo.media_type === "image" ? mediaUrl(photo.media_path, "media") : null;

  if (thumb && full && thumb !== full) {
    return { src: thumb, fallbackSrc: full };
  }
  if (thumb) return { src: thumb };
  if (full) return { src: full };
  return { src: "" };
}
