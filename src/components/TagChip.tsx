import Link from "next/link";

export function TagChip({
  tag,
  onClick,
}: {
  tag: string;
  onClick?: () => void;
}) {
  const className =
    "inline-flex min-h-[44px] cursor-pointer items-center rounded-full border px-3 py-2 text-xs text-[var(--text-secondary)] transition-colors hover:border-[rgba(200,169,110,0.3)] hover:bg-[var(--accent-dim)] hover:text-[var(--accent)] no-underline";
  const style = { background: "var(--tag-bg)", borderColor: "var(--tag-border)" };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} style={style}>
        {tag}
      </button>
    );
  }

  return (
    <Link href={`/search?q=${encodeURIComponent(tag)}`} className={className} style={style}>
      {tag}
    </Link>
  );
}
