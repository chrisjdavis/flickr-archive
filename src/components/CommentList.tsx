import { format, parseISO } from "date-fns";
import type { CommentRow } from "@/lib/types";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr.replace(" ", "T")), "yyyy-MM-dd");
  } catch {
    return dateStr;
  }
}

function extractAuthor(user: string | null): string {
  if (!user) return "Unknown";
  const match = user.match(/([^/]+)\/?$/);
  return match?.[1] ?? user;
}

function initials(author: string): string {
  const clean = author.replace(/^@/, "");
  if (clean.length <= 2) return clean.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function CommentList({ comments }: { comments: CommentRow[] }) {
  if (comments.length === 0) {
    return <p className="text-[13px] text-[var(--text-muted)]">No comments.</p>;
  }

  return (
    <ul className="flex list-none flex-col gap-4">
      {comments.map((comment) => {
        const author = extractAuthor(comment.author_nsid);
        return (
          <li key={comment.id} className="flex gap-2.5">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold text-[var(--text-muted)]"
              style={{ background: "var(--bg-hover)", borderColor: "var(--border)" }}
            >
              {initials(author)}
            </div>
            <div className="min-w-0 flex-1">
              <div>
                <span className="text-[12.5px] font-medium text-[var(--text-primary)]">{author}</span>
                <span className="font-mono ml-2 text-[11px] text-[var(--text-muted)]">
                  {formatDate(comment.commented_at)}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                {comment.body}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
