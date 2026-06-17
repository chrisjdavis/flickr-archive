import fs from "node:fs";
import path from "node:path";
import type { ImportReport } from "./report";
import type { ImportPhase } from "./run-import";

export type ImportJobStatus = "idle" | "running" | "complete" | "error";

export type ImportJobState = {
  status: ImportJobStatus;
  phase: ImportPhase | "idle";
  message: string;
  current: number;
  total: number;
  startedAt: string | null;
  finishedAt: string | null;
  report: ImportReport | null;
  error: string | null;
  activity: string[];
};

const MAX_ACTIVITY = 30;

function idleState(): ImportJobState {
  return {
    status: "idle",
    phase: "idle",
    message: "",
    current: 0,
    total: 0,
    startedAt: null,
    finishedAt: null,
    report: null,
    error: null,
    activity: [],
  };
}

function uploadRoot(): string {
  return path.join(process.cwd(), ".import-uploads");
}

function statusFilePath(): string {
  return path.join(uploadRoot(), "import-status.json");
}

function lockFilePath(): string {
  return path.join(uploadRoot(), "import.lock");
}

function cloneState(source: ImportJobState): ImportJobState {
  return {
    ...source,
    activity: [...source.activity],
    report: source.report
      ? {
          ...source.report,
          photosMissingMedia: [...source.report.photosMissingMedia],
          orphanMedia: [...source.report.orphanMedia],
          albumsMissingPhotos: [...source.report.albumsMissingPhotos],
          mediaTypeCounts: { ...source.report.mediaTypeCounts },
        }
      : null,
  };
}

function persistState(next: ImportJobState): void {
  const file = statusFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next));
}

function appendActivity(state: ImportJobState, message: string): string[] {
  const entry = `${new Date().toISOString()}|${message}`;
  const activity = [...state.activity, entry];
  return activity.length > MAX_ACTIVITY ? activity.slice(-MAX_ACTIVITY) : activity;
}

let state: ImportJobState = idleState();
let running = false;

export function getImportState(): ImportJobState {
  const file = statusFilePath();
  if (fs.existsSync(file)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(file, "utf8")) as ImportJobState;
      state = {
        ...idleState(),
        ...loaded,
        activity: loaded.activity ?? [],
      };
      running = state.status === "running";
    } catch {
      /* use in-memory state */
    }
  }
  return cloneState(state);
}

export function isImportRunning(): boolean {
  getImportState();
  return running || fs.existsSync(lockFilePath());
}

export function resetImportState(): void {
  if (running) return;
  state = idleState();
  persistState(state);
}

function commit(next: ImportJobState): void {
  state = next;
  running = next.status === "running";
  persistState(state);
}

export function tryAcquireImportLock(): boolean {
  fs.mkdirSync(uploadRoot(), { recursive: true });
  try {
    fs.writeFileSync(lockFilePath(), String(process.pid), { flag: "wx", mode: 0o600 });
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EEXIST") return false;
    throw err;
  }
}

export function releaseImportLock(): void {
  try {
    fs.unlinkSync(lockFilePath());
  } catch {
    /* ignore */
  }
}

export function tryStartImportJob(): boolean {
  if (running || fs.existsSync(lockFilePath())) return false;
  if (!tryAcquireImportLock()) return false;

  const message = "Starting import...";
  commit({
    ...idleState(),
    status: "running",
    phase: "preparing",
    message,
    startedAt: new Date().toISOString(),
    activity: appendActivity(idleState(), message),
  });
  return true;
}

export function markImportStarted(): void {
  if (!tryStartImportJob()) {
    throw new Error("An import is already in progress.");
  }
}

export function updateImportProgress(update: {
  phase?: ImportPhase | "idle";
  message?: string;
  current?: number;
  total?: number;
}): void {
  const message = update.message ?? state.message;
  const next: ImportJobState = {
    ...state,
    ...update,
    phase: update.phase ?? state.phase,
    message,
    current: update.current ?? state.current,
    total: update.total ?? state.total,
    activity:
      update.message && update.message !== state.message
        ? appendActivity(state, update.message)
        : state.activity,
  };
  commit(next);
}

export function markImportComplete(report: ImportReport): void {
  const message = "Import complete.";
  commit({
    ...state,
    status: "complete",
    phase: "complete",
    message,
    finishedAt: new Date().toISOString(),
    report,
    activity: appendActivity(state, message),
  });
  releaseImportLock();
}

export function markImportError(error: string): void {
  commit({
    ...state,
    status: "error",
    phase: "idle",
    message: error,
    error,
    finishedAt: new Date().toISOString(),
    activity: appendActivity(state, error),
  });
  releaseImportLock();
}
