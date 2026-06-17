export function photoPageHref(photoId: string, albumId?: string): string {
  if (albumId) {
    return `/photos/${photoId}?album=${encodeURIComponent(albumId)}`;
  }
  return `/photos/${photoId}`;
}

export function photoPageQuery(albumId?: string): string {
  return albumId ? `?album=${encodeURIComponent(albumId)}` : "";
}
