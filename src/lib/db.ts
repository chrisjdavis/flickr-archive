import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

export function getArchivePath(): string {
  const envPath = process.env.FLICKR_ARCHIVE_PATH;
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(projectRoot, envPath);
  }
  return path.resolve(projectRoot, "archive");
}

export function getDbPath(): string {
  return path.join(getArchivePath(), "index.sqlite");
}

export function assertArchiveExists(): void {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(
      `Archive database not found at ${dbPath}. Import your Flickr export at /import`
    );
  }
}

export function archiveExists(): boolean {
  return fs.existsSync(getDbPath());
}

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  assertArchiveExists();
  const dbPath = getDbPath();
  const migrator = openWritableDb(dbPath);
  migrateSchema(migrator);
  migrator.close();
  dbInstance = new Database(dbPath, { readonly: true });
  dbInstance.pragma("journal_mode = WAL");
  return dbInstance;
}

export function openWritableDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

export function migrateSchema(db: Database.Database): void {
  const columns = (db.prepare("PRAGMA table_info(photos)").all() as { name: string }[]).map(
    (c) => c.name
  );
  if (!columns.includes("width")) {
    db.exec("ALTER TABLE photos ADD COLUMN width INTEGER");
  }
  if (!columns.includes("height")) {
    db.exec("ALTER TABLE photos ADD COLUMN height INTEGER");
  }
}

export function initSchema(db: Database.Database): void {
  const schemaPath = path.join(projectRoot, "src/lib/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);
  migrateSchema(db);
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function getMediaDir(): string {
  return path.join(getArchivePath(), "media");
}

export function getThumbsDir(): string {
  return path.join(getArchivePath(), "thumbs");
}
