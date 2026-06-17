"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon, ZoomInIcon } from "./icons";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

type ZoomablePhotoProps = {
  src: string;
  alt: string;
};

export function ZoomablePhoto({ src, alt }: ZoomablePhotoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex h-full min-h-0 w-full cursor-zoom-in items-start justify-center border-0 bg-transparent p-0"
        aria-label="Open zoom view"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
          <ZoomInIcon className="h-10 w-10 text-white drop-shadow-md" />
        </span>
      </button>

      {open && <ZoomOverlay src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

function ZoomOverlay({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const effectiveScale = fitScale * zoom;

  const updateFitScale = useCallback(() => {
    const container = containerRef.current;
    if (!container || naturalSize.w === 0) return;
    const fit = Math.min(
      container.clientWidth / naturalSize.w,
      container.clientHeight / naturalSize.h
    );
    setFitScale(fit);
  }, [naturalSize]);

  useEffect(() => {
    updateFitScale();
    window.addEventListener("resize", updateFitScale);
    return () => window.removeEventListener("resize", updateFitScale);
  }, [updateFitScale]);

  const clampOffset = useCallback(
    (x: number, y: number, z: number) => {
      const container = containerRef.current;
      if (!container || z <= MIN_ZOOM) return { x: 0, y: 0 };

      const scale = fitScale * z;
      const displayW = naturalSize.w * scale;
      const displayH = naturalSize.h * scale;
      const maxX = Math.max(0, (displayW - container.clientWidth) / 2);
      const maxY = Math.max(0, (displayH - container.clientHeight) / 2);

      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [fitScale, naturalSize]
  );

  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      setZoom((prev) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * factor));
        if (next === prev) return prev;

        const container = containerRef.current;
        if (!container) return next;

        const rect = container.getBoundingClientRect();
        const cx = clientX !== undefined ? clientX - rect.left - rect.width / 2 : 0;
        const cy = clientY !== undefined ? clientY - rect.top - rect.height / 2 : 0;
        const ratio = next / prev;

        setOffset((o) => clampOffset(cx - (cx - o.x) * ratio, cy - (cy - o.y) * ratio, next));

        return next;
      });
    },
    [clampOffset]
  );

  const reset = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomAt(1.25);
      }
      if (e.key === "-") {
        e.preventDefault();
        zoomAt(0.8);
      }
      if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, zoomAt, reset]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(factor, e.clientX, e.clientY);
    };

    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [zoomAt]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  useEffect(() => {
    if (naturalSize.w > 0) updateFitScale();
  }, [naturalSize, updateFitScale]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= MIN_ZOOM) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy, zoom));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(false);
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (zoom > MIN_ZOOM + 0.05) {
      reset();
    } else {
      zoomAt(2.5, e.clientX, e.clientY);
    }
  };

  const pct = Math.round(zoom * 100);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: "rgba(0,0,0,0.92)" }}
      role="dialog"
      aria-modal
      aria-label="Zoom view"
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <span className="font-mono text-xs text-[var(--text-muted)]">{pct}%</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }}
          aria-label="Close zoom view"
        >
          <CloseIcon />
        </button>
      </div>

      <div
        ref={containerRef}
        className={`relative min-h-0 flex-1 touch-none select-none overflow-hidden ${zoom > MIN_ZOOM ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="flex h-full w-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            onLoad={onImageLoad}
            className="max-w-none transition-transform duration-75 will-change-transform"
            style={{
              width: naturalSize.w > 0 ? naturalSize.w * effectiveScale : undefined,
              height: naturalSize.w > 0 ? naturalSize.h * effectiveScale : undefined,
              maxWidth: naturalSize.w === 0 ? "100%" : undefined,
              maxHeight: naturalSize.w === 0 ? "100%" : undefined,
              objectFit: naturalSize.w === 0 ? "contain" : undefined,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 px-4 py-4">
        <ZoomButton label="Zoom out" onClick={() => zoomAt(0.8)} disabled={zoom <= MIN_ZOOM}>
          −
        </ZoomButton>
        <button
          type="button"
          onClick={reset}
          className="font-mono min-w-[4rem] rounded border px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          {pct}%
        </button>
        <ZoomButton label="Zoom in" onClick={() => zoomAt(1.25)} disabled={zoom >= MAX_ZOOM}>
          +
        </ZoomButton>
        <span className="ml-2 hidden text-[11px] text-[var(--text-muted)] sm:inline">
          Scroll to zoom · Drag to pan · Double-click to toggle
        </span>
      </div>
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 min-w-9 items-center justify-center rounded border px-3 text-lg leading-none text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-30"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {children}
    </button>
  );
}
