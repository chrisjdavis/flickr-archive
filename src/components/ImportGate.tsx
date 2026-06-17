"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UploadIcon } from "./icons";

export function ImportGate() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/import/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      if (!res.ok) {
        setError("Invalid import password.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not verify import password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16 md:px-12 md:py-20">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-dim)] text-[var(--accent)]">
            <UploadIcon />
          </span>
          <div>
            <h1 className="font-serif text-[22px] font-normal text-[var(--text-primary)]">
              Import access
            </h1>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Enter the import password for this server.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="import-secret" className="sr-only">
              Import password
            </label>
            <input
              id="import-secret"
              type="password"
              autoComplete="current-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Import password"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] px-4 py-3 text-[14px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
              required
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-300" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || secret.length === 0}
            className="btn-accent w-full min-h-[44px] rounded-lg border px-4 py-2.5 text-[13px] font-medium disabled:opacity-50"
          >
            {pending ? "Checking..." : "Continue to import"}
          </button>
        </form>
      </div>
    </div>
  );
}
