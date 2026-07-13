"use client";

import { useCallback, useRef, useState } from "react";

// PopoverShell — the tiny client-only wrapper that gives a hover/focus tooltip
// its behavior: visibility (pure CSS: group-hover + group-focus-within) plus
// *edge-aware positioning* so a trigger near the viewport edge never clips the
// tooltip off-screen.
//
// Crucially, the `trigger` and `children` are SERVER-rendered nodes passed in as
// props — this shell never re-renders them on the client. That keeps the drawn
// <GameSprite> art (whose SVG uses floating-point trig coordinates that can
// differ by a ULP between the SSR and browser engines) server-only, so there's
// no hydration mismatch and no client JS cost for the artwork.

/** Tooltip width in px — must match the `w-60` (15rem) class below. */
const TOOLTIP_W = 240;

type Align = "center" | "start" | "end";

export function PopoverShell({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [align, setAlign] = useState<Align>("center");

  const reposition = useCallback(() => {
    const el = wrapRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const half = TOOLTIP_W / 2;
    const margin = 8;
    if (center - half < margin) setAlign("start");
    else if (center + half > window.innerWidth - margin) setAlign("end");
    else setAlign("center");
  }, []);

  const posClass =
    align === "start"
      ? "left-0"
      : align === "end"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <div
      ref={wrapRef}
      onMouseEnter={reposition}
      onFocusCapture={reposition}
      className="group relative inline-flex"
    >
      {trigger}
      <div
        role="dialog"
        className={`pointer-events-none absolute top-full z-50 mt-2 w-60 rounded-xl border border-border bg-surface-2 p-3 opacity-0 shadow-2xl transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 ${posClass}`}
      >
        {children}
      </div>
    </div>
  );
}

export default PopoverShell;
