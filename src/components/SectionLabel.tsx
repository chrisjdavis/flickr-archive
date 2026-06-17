export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
      {children}
    </div>
  );
}
