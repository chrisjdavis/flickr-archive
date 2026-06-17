import { Fragment, type ReactNode } from "react";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightText(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;

  try {
    const parts = text.split(new RegExp(`(${escapeRegex(trimmed)})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === trimmed.toLowerCase() ? (
        <mark
          key={i}
          className="rounded-sm px-0.5"
          style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
        >
          {part}
        </mark>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      )
    );
  } catch {
    return text;
  }
}
