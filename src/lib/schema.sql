CREATE TABLE IF NOT EXISTS account (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  screen_name TEXT NOT NULL,
  real_name TEXT,
  path_alias TEXT,
  description TEXT,
  join_date TEXT,
  profile_url TEXT,
  stats_json TEXT
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  date_taken TEXT,
  date_imported TEXT,
  media_path TEXT NOT NULL,
  thumb_path TEXT,
  media_type TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  license TEXT,
  width INTEGER,
  height INTEGER
);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_photo_id TEXT,
  photo_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS album_photos (
  album_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (album_id, photo_id),
  FOREIGN KEY (album_id) REFERENCES albums(id),
  FOREIGN KEY (photo_id) REFERENCES photos(id)
);

CREATE TABLE IF NOT EXISTS tags (
  photo_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (photo_id, tag),
  FOREIGN KEY (photo_id) REFERENCES photos(id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  author_nsid TEXT,
  body TEXT NOT NULL,
  commented_at TEXT,
  FOREIGN KEY (photo_id) REFERENCES photos(id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS photos_fts USING fts5(
  photo_id UNINDEXED,
  title,
  description,
  tags
);

CREATE INDEX IF NOT EXISTS idx_photos_date_taken ON photos(date_taken DESC);
CREATE INDEX IF NOT EXISTS idx_album_photos_album ON album_photos(album_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
