export const runtime = "nodejs";

import path from "node:path";
import { format, parseISO } from "date-fns";
import { withArchivePage } from "@/lib/archive-layout";
import {
  formatBytes,
  formatShortDate,
  getArchiveFilesystemInfo,
  shortenPath,
} from "@/lib/archive-info";
import { getAccount, getArchiveStats } from "@/lib/queries";
import { sanitizeDescription } from "@/lib/sanitize";
import { isSafeHttpUrl } from "@/lib/url-safe";
import packageJson from "../../../package.json";

function formatPhotoDate(dateStr: string | null): string {
  if (!dateStr) return "n/a";
  try {
    return format(parseISO(dateStr.replace(" ", "T")), "yyyy-MM-dd");
  } catch {
    return dateStr.slice(0, 10);
  }
}

function StatCard({
  value,
  unit,
  label,
}: {
  value: string | number;
  unit?: string;
  label: string;
}) {
  return (
    <div
      className="rounded-xl border p-5 px-6"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <div className="font-mono text-[32px] font-light tracking-tight text-[var(--text-primary)]">
        {value}
        {unit && (
          <span className="ml-0.5 text-base text-[var(--text-muted)]">{unit}</span>
        )}
      </div>
      <div className="mt-1.5 text-[13px] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

export default async function AboutPage() {
  return withArchivePage(async () => {
    const account = getAccount();
    const stats = getArchiveStats();
    const fsInfo = getArchiveFilesystemInfo();

    if (!account) {
      return (
        <p className="px-6 py-12 text-[var(--text-muted)] md:px-12">No account information found.</p>
      );
    }

    const description = account.description ? sanitizeDescription(account.description) : "";
    const displayName = account.screen_name || account.real_name || "Unknown";
    const username = account.path_alias || account.screen_name;

    let memberYears: number | null = null;
    if (account.join_date) {
      try {
        const joined = parseISO(account.join_date.replace(" ", "T"));
        memberYears = Math.max(1, new Date().getFullYear() - joined.getFullYear());
      } catch {
        /* ignore */
      }
    }

    return (
    <div className="mx-auto max-w-[900px] px-6 py-14 pb-20 md:px-12">
      <div className="border-b pb-12" style={{ borderColor: "var(--border)" }}>
        <div>
          <h1 className="font-serif text-[28px] font-normal tracking-tight text-[var(--text-primary)]">
            {displayName}
          </h1>
          <div className="font-mono mt-1 text-sm text-[var(--text-muted)]">
            {username && <>@{username.replace(/^@/, "")}</>}
            {username && account.join_date && <> &nbsp;·&nbsp; </>}
            {account.join_date && <>Member since {account.join_date.slice(0, 4)}</>}
          </div>

          {description && (
            <div
              className="prose prose-sm prose-invert mt-3.5 max-w-[520px] text-[14px] leading-relaxed text-[var(--text-secondary)]"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}

          <div className="mt-5 flex flex-wrap gap-6">
            <div>
              <div className="font-mono text-[22px] tracking-tight text-[var(--text-primary)]">
                {stats.totalPhotos.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Photos &amp; videos</div>
            </div>
            <div>
              <div className="font-mono text-[22px] tracking-tight text-[var(--text-primary)]">
                {stats.totalAlbums.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Albums</div>
            </div>
            <div>
              <div className="font-mono text-[22px] tracking-tight text-[var(--text-primary)]">
                {stats.uniqueTags.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Tags used</div>
            </div>
          </div>

          {account.profile_url && isSafeHttpUrl(account.profile_url) && (
            <p className="mt-5 text-sm">
              <a
                href={account.profile_url}
                className="text-[var(--accent)] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Original Flickr profile
              </a>
            </p>
          )}
        </div>
      </div>

      <section className="border-b py-10" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-serif mb-6 text-xl font-normal tracking-tight text-[var(--text-primary)]">
          Archive at a glance
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard value={stats.totalPhotos.toLocaleString()} unit="items" label="Total photos & videos" />
          <StatCard value={stats.totalAlbums.toLocaleString()} unit="sets" label="Albums created" />
          <StatCard value={stats.totalComments.toLocaleString()} unit="cmts" label="Comments received" />
          <StatCard value={stats.uniqueTags.toLocaleString()} unit="tags" label="Unique tags" />
          {memberYears !== null && (
            <StatCard value={memberYears} unit="yrs" label={`Years on Flickr${account.join_date ? ` (since ${account.join_date.slice(0, 4)})` : ""}`} />
          )}
          {fsInfo.mediaSizeBytes !== null && (
            <StatCard
              value={formatBytes(fsInfo.mediaSizeBytes)}
              label="Archive size on disk"
            />
          )}
        </div>
      </section>

      <section className="pt-10">
        <h2 className="font-serif mb-6 text-xl font-normal tracking-tight text-[var(--text-primary)]">
          Export details
        </h2>
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--border)" }}
        >
          {[
            ["Database last updated", formatShortDate(fsInfo.dbModified)],
            ["Database file", `${path.basename(fsInfo.dbPath)} · ${formatBytes(fsInfo.dbSizeBytes)}`],
            ["Media root", shortenPath(fsInfo.mediaRoot)],
            ["Earliest photo", formatPhotoDate(stats.earliestPhoto)],
            ["Latest photo", formatPhotoDate(stats.latestPhoto)],
            ["Photos", stats.totalPhotos.toLocaleString()],
            ["Videos", stats.totalVideos.toLocaleString()],
            ["App version", `flickr-archive v${packageJson.version}`],
          ].map(([key, val], i, arr) => (
            <div
              key={key}
              className="flex items-center justify-between px-5 py-3.5"
              style={{
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : undefined,
              }}
            >
              <span className="text-[13.5px] text-[var(--text-secondary)]">{key}</span>
              <span
                className={`font-mono text-[13px] ${key === "App version" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
              >
                {val}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
    );
  });
}
