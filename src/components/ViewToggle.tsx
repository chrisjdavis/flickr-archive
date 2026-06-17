"use client";

import { MasonryToggleIcon, Grid3Icon, Grid5Icon } from "./icons";

export type GridColumns = 3 | 4 | 5;

export function ViewToggle({
  columns,
  onChange,
}: {
  columns: GridColumns;
  onChange: (cols: GridColumns) => void;
}) {
  const buttons: { cols: GridColumns; icon: React.ComponentType<{ className?: string }>; title: string }[] = [
    { cols: 4, icon: MasonryToggleIcon, title: "Masonry (4 columns)" },
    { cols: 3, icon: Grid3Icon, title: "3 columns" },
    { cols: 5, icon: Grid5Icon, title: "5 columns" },
  ];

  return (
    <div
      className="flex gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-0.5"
      role="group"
      aria-label="Grid density"
    >
      {buttons.map(({ cols, icon: Icon, title }) => (
        <button
          key={cols}
          type="button"
          title={title}
          aria-pressed={columns === cols}
          aria-label={title}
          onClick={() => onChange(cols)}
          className={`flex h-11 w-11 items-center justify-center rounded transition-colors ${
            columns === cols
              ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
