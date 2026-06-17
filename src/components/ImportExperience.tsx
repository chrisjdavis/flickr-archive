"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { UploadIcon } from "./icons";
import { SectionLabel } from "./SectionLabel";
import {
  clearUploadSession,
  formatFileSize,
  startImport,
  uploadZipFile,
} from "@/lib/upload-import";

type QueuedFile = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "uploaded" | "failed";
  progress: number;
  error?: string;
};

type ImportStatus = {
  status: "idle" | "running" | "complete" | "error";
  phase: string;
  message: string;
  current: number;
  total: number;
  archiveExists: boolean;
  error: string | null;
  activity: string[];
  report: {
    photosImported: number;
    albumsImported: number;
    commentsImported: number;
    tagsImported: number;
    photosMissingMedia: string[];
    orphanMedia: string[];
  } | null;
};

const PHASE_ORDER = [
  "preparing",
  "extracting",
  "parsing",
  "matching",
  "thumbnails",
  "database",
  "complete",
] as const;

function formatActivityEntry(entry: string): { time: string; message: string } {
  const split = entry.indexOf("|");
  if (split === -1) return { time: "", message: entry };
  const iso = entry.slice(0, split);
  const message = entry.slice(split + 1);
  let time = "";
  try {
    time = new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    time = "";
  }
  return { time, message };
}

function phaseIndex(phase: string): number {
  const idx = PHASE_ORDER.indexOf(phase as (typeof PHASE_ORDER)[number]);
  return idx === -1 ? 0 : idx;
}

const PHASE_LABELS: Record<string, string> = {
  preparing: "Preparing",
  extracting: "Extracting",
  parsing: "Parsing metadata",
  matching: "Matching media",
  thumbnails: "Generating thumbnails",
  database: "Building index",
  complete: "Complete",
};

const EXPORT_CHECKLIST = [
  {
    name: "Metadata ZIP",
    example: "yourname_part1.zip",
    detail: "Titles, tags, albums, comments, and account info",
  },
  {
    name: "Media ZIPs",
    example: "data-download-1.zip, data-download-2.zip, …",
    detail: "Original photo and video files (upload every file from your export)",
  },
];

function panelClassName() {
  return "rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 md:p-8";
}

function filterZipFiles(files: File[]): { zips: File[]; rejected: number } {
  const zips = files.filter((file) => file.name.toLowerCase().endsWith(".zip"));
  return { zips, rejected: files.length - zips.length };
}

export function ImportExperience({ initialArchiveExists }: { initialArchiveExists: boolean }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [force, setForce] = useState(initialArchiveExists);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadIndex, setUploadIndex] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [importActive, setImportActive] = useState(false);
  const [status, setStatus] = useState<ImportStatus | null>(null);

  const updateQueuedFile = useCallback((id: string, patch: Partial<QueuedFile>) => {
    setQueuedFiles((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const pollStatus = useCallback(async () => {
    const res = await fetch("/api/import", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as ImportStatus;
    setStatus({
      ...data,
      activity: data.activity ?? [],
    });
    if (data.status === "running") {
      setImportActive(true);
    }
    if (data.status === "complete" || data.status === "error") {
      setImportActive(false);
    }
    return data;
  }, []);

  useEffect(() => {
    void pollStatus().then((data) => {
      if (data?.status === "running") setImportActive(true);
    });
  }, [pollStatus]);

  useEffect(() => {
    if (!importActive && status?.status !== "running") return;
    void pollStatus();
    const timer = window.setInterval(() => {
      void pollStatus();
    }, 500);
    return () => window.clearInterval(timer);
  }, [importActive, status?.status, pollStatus]);

  useEffect(() => {
    if (status?.status === "complete") {
      setQueuedFiles([]);
      router.refresh();
    }
  }, [status?.status, router]);

  const importing = status?.status === "running" || importActive;
  const running = importing || uploading;
  const showProgress = uploading || importActive || (status !== null && status.status !== "idle");
  const progressPct =
    status && status.total > 0 ? Math.min(100, Math.round((status.current / status.total) * 100)) : 0;
  const activePhaseIndex = status ? phaseIndex(status.phase) : 0;

  function addFiles(files: File[]) {
    const { zips, rejected } = filterZipFiles(files);
    if (rejected > 0) {
      setSubmitError(
        `Only ZIP files are allowed. ${rejected} non-ZIP file${rejected === 1 ? "" : "s"} ignored.`
      );
    } else {
      setSubmitError(null);
    }

    if (zips.length === 0) return;

    setQueuedFiles((prev) => {
      const names = new Set(prev.map((item) => item.id));
      const merged = [...prev];
      for (const file of zips) {
        if (!names.has(file.name)) {
          merged.push({
            id: file.name,
            file,
            status: "queued",
            progress: 0,
          });
          names.add(file.name);
        }
      }
      return merged;
    });
  }

  function onFilesSelected(list: FileList | null) {
    if (!list) return;
    addFiles(Array.from(list));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (running) return;
    addFiles(Array.from(e.dataTransfer.files));
  }

  async function startUploadImport() {
    if (queuedFiles.length === 0) return;

    setSubmitError(null);
    setUploading(true);
    let sessionId: string | null = null;

    try {
      const batch = queuedFiles.filter((item) => item.status !== "uploaded");

      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];

        setUploadIndex(i + 1);
        updateQueuedFile(item.id, { status: "uploading", progress: 0, error: undefined });

        try {
          const result = await uploadZipFile(item.file, sessionId, (progress) => {
            updateQueuedFile(item.id, { progress });
          });
          sessionId = result.sessionId;
          updateQueuedFile(item.id, { status: "uploaded", progress: 100 });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed.";
          updateQueuedFile(item.id, { status: "failed", error: message });
          if (sessionId) await clearUploadSession(sessionId);
          throw new Error(`Failed to upload ${item.file.name}: ${message}`);
        }
      }

      if (!sessionId) {
        throw new Error("No files were uploaded.");
      }

      await startImport(sessionId, force);
      setImportActive(true);
      const handoffMessage = "Upload complete. Starting import...";
      setStatus({
        status: "running",
        phase: "preparing",
        message: handoffMessage,
        current: 0,
        total: 0,
        archiveExists: initialArchiveExists,
        error: null,
        activity: [`${new Date().toISOString()}|${handoffMessage}`],
        report: null,
      });
      await pollStatus();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Import failed to start.");
    } finally {
      setUploading(false);
      setUploadIndex(0);
    }
  }

  function fileStatusLabel(item: QueuedFile): string {
    if (item.status === "queued") return "Waiting";
    if (item.status === "uploading") return `${item.progress}%`;
    if (item.status === "uploaded") return "Uploaded";
    return "Failed";
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-12 md:py-14">
      <header className="mb-10">
        <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--accent)]">
          Setup
        </p>
        <h1 className="font-serif mt-2 text-3xl font-normal tracking-tight text-[var(--text-primary)]">
          Import Flickr export
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Upload your Flickr export ZIP files to build a local archive with thumbnails and a
          searchable index.
        </p>
      </header>

      <div className={`mb-6 ${panelClassName()}`}>
        <SectionLabel>What to upload</SectionLabel>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          After requesting a data export from Flickr, download every ZIP in the export folder. You
          need at least one metadata file and one or more media files.
        </p>
        <ul className="mt-4 space-y-3">
          {EXPORT_CHECKLIST.map((item) => (
            <li
              key={item.name}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] px-4 py-3"
            >
              <div className="text-[13px] font-medium text-[var(--text-primary)]">{item.name}</div>
              <div className="font-mono mt-1 text-[12px] text-[var(--accent)]">{item.example}</div>
              <div className="mt-1 text-[12px] text-[var(--text-muted)]">{item.detail}</div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-[var(--text-muted)]">
          Large exports can take several minutes to upload and process. Keep this tab open until
          import completes.
        </p>
      </div>

      {initialArchiveExists && (
        <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
          An archive is already imported. Enable re-import below to replace media, thumbnails, and
          the database.
        </div>
      )}

      <div className={panelClassName()}>
        <SectionLabel>Upload ZIP files</SectionLabel>
        <p className="mt-2 text-[13px] text-[var(--text-muted)]">
          Drag files here or choose them from your computer. Only{" "}
          <code className="text-[var(--text-secondary)]">.zip</code> files are accepted.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!running) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mt-4 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver
              ? "border-[var(--accent)] bg-[var(--accent-dim)]"
              : "border-[var(--border-mid)] bg-[var(--bg-raised)]"
          } ${running ? "opacity-60" : ""}`}
        >
          <UploadIcon className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
          <p className="text-[14px] text-[var(--text-secondary)]">
            Drop Flickr export ZIPs here
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">or</p>
          <label className="btn-ghost mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border px-4 py-2.5 text-[13px] transition-colors hover:border-[var(--border-mid)] hover:text-[var(--text-primary)]">
            Choose ZIP files
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".zip,application/zip,application/x-zip-compressed"
              disabled={running}
              onChange={(e) => onFilesSelected(e.target.files)}
              className="sr-only"
            />
          </label>
        </div>

        {queuedFiles.length > 0 && (
          <ul className="mt-4 space-y-2" aria-live="polite">
            {queuedFiles.map((item) => (
              <li
                key={item.id}
                className="rounded border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[12px] text-[var(--text-secondary)]">
                      {item.file.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {formatFileSize(item.file.size)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-medium uppercase tracking-wide ${
                      item.status === "failed"
                        ? "text-red-300"
                        : item.status === "uploaded"
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-muted)]"
                    }`}
                  >
                    {fileStatusLabel(item)}
                  </span>
                </div>
                {(item.status === "uploading" || item.status === "uploaded") && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-surface)]">
                    <div
                      className="h-full bg-[var(--accent)] transition-[width] duration-150"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.error && (
                  <p className="mt-2 text-[11px] text-red-300">{item.error}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          disabled={running || queuedFiles.length === 0}
          onClick={() => void startUploadImport()}
          className="btn-accent mt-5 min-h-[44px] rounded-lg border px-4 py-2.5 text-[13px] font-medium transition-opacity disabled:opacity-40"
        >
          {uploading
            ? `Uploading file ${uploadIndex} of ${queuedFiles.length}…`
            : importing
              ? "Import running..."
              : "Upload and import"}
        </button>

        <label className="mt-6 flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={force}
            disabled={running}
            onChange={(e) => setForce(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Re-import and replace existing archive
        </label>
      </div>

      {submitError && (
        <div
          className="mt-6 rounded-lg border px-4 py-3 text-[13px] text-red-300"
          style={{ background: "rgba(127,29,29,0.25)", borderColor: "rgba(248,113,113,0.25)" }}
          role="alert"
        >
          {submitError}
        </div>
      )}

      {showProgress && (
        <div className={`mt-6 ${panelClassName()}`} aria-live="polite">
          <div className="flex items-center justify-between gap-4">
            <SectionLabel>
              {uploading ? "Upload progress" : "Import progress"}
            </SectionLabel>
            {!uploading && status && (
              <span className="font-mono text-[12px] text-[var(--text-muted)]">
                {PHASE_LABELS[status.phase] ?? status.phase}
              </span>
            )}
          </div>

          {uploading && (
            <p className="mt-3 text-[14px] text-[var(--text-secondary)]">
              Uploading file {uploadIndex} of {queuedFiles.length}…
            </p>
          )}

          {!uploading && status && (
            <p className="mt-3 text-[14px] text-[var(--text-secondary)]">
              {status.message || "Working..."}
            </p>
          )}

          {!uploading && status && status.status === "running" && (
            <ol className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {PHASE_ORDER.filter((p) => p !== "complete").map((phase, index) => {
                const done = activePhaseIndex > index;
                const current = status.phase === phase;
                return (
                  <li
                    key={phase}
                    className={`rounded border px-3 py-2 text-[12px] ${
                      current
                        ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--text-primary)]"
                        : done
                          ? "border-[var(--border)] text-[var(--text-secondary)]"
                          : "border-[var(--border)] text-[var(--text-muted)]"
                    }`}
                  >
                    <span className="font-medium">{PHASE_LABELS[phase]}</span>
                    {current && <span className="ml-2 text-[var(--accent)]">· now</span>}
                    {done && !current && (
                      <span className="ml-2 text-[var(--text-muted)]">· done</span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {!uploading && status && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-raised)]">
                {status.total > 0 && status.status === "running" ? (
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                ) : status.status === "running" ? (
                  <div className="import-bar-indeterminate h-full bg-[var(--accent)]" />
                ) : status.status === "complete" ? (
                  <div className="h-full w-full bg-[var(--accent)]" />
                ) : null}
              </div>
              {status.total > 0 && (
                <p className="font-mono mt-2 text-[12px] text-[var(--text-muted)]">
                  {status.current.toLocaleString()} / {status.total.toLocaleString()} ({progressPct}%)
                </p>
              )}
              {status.status === "running" && status.total === 0 && (
                <p className="mt-2 text-[12px] text-[var(--text-muted)]">This step may take a few minutes.</p>
              )}
            </div>
          )}

          {!uploading && status && (status.activity?.length ?? 0) > 0 && (
            <div className="mt-5 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-raised)]">
              <ul className="divide-y divide-[var(--border)]">
                {[...(status.activity ?? [])].reverse().map((entry, i) => {
                  const { time, message } = formatActivityEntry(entry);
                  return (
                    <li key={`${entry}-${i}`} className="px-3 py-2 text-[12px]">
                      {time && (
                        <span className="font-mono mr-2 text-[var(--text-muted)]">{time}</span>
                      )}
                      <span className="text-[var(--text-secondary)]">{message}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {status?.status === "error" && status.error && (
            <p className="mt-4 text-[13px] text-red-300" role="alert">
              {status.error}
            </p>
          )}

          {status?.status === "complete" && status.report && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Photos", status.report.photosImported],
                  ["Albums", status.report.albumsImported],
                  ["Comments", status.report.commentsImported],
                  ["Tags", status.report.tagsImported],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-[var(--bg-raised)] p-3">
                    <div className="text-[10.5px] uppercase tracking-wide text-[var(--text-muted)]">
                      {label}
                    </div>
                    <div className="font-mono mt-1 text-[18px] text-[var(--text-primary)]">
                      {Number(value).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {(status.report.photosMissingMedia.length > 0 ||
                status.report.orphanMedia.length > 0) && (
                <p className="text-[13px] text-[var(--text-muted)]">
                  {status.report.photosMissingMedia.length > 0 &&
                    `${status.report.photosMissingMedia.length} photos missing media. `}
                  {status.report.orphanMedia.length > 0 &&
                    `${status.report.orphanMedia.length} orphan media files.`}
                </p>
              )}

              <Link
                href="/"
                className="btn-accent inline-flex min-h-[44px] items-center rounded-lg border px-4 py-2.5 text-[13px] font-medium no-underline"
              >
                Open photostream
              </Link>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
