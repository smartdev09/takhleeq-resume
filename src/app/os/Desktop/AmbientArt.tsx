/**
 * `<AmbientArt>` — the small stationery scene that lives in the bottom-right
 * corner of the desktop (plan §4.1: "a desk with coffee, a typewriter, paper
 * stack, plant"). Pure CSS shapes, no images. Hidden on small viewports
 * (≤768px per plan §7) where it would crowd the icon grid.
 *
 * Decorative only — `aria-hidden` so screen readers skip it entirely.
 *
 * Each piece is an absolutely positioned div using radial / conic gradients
 * to suggest the shape. Performance is irrelevant (pure paint, never
 * animated); discoverability cost is zero (hidden from a11y tree).
 */

"use client";

export function AmbientArt() {
  return (
    <div
      data-testid="os-ambient-art"
      aria-hidden
      className="pointer-events-none absolute bottom-16 right-12 hidden h-44 w-72 select-none md:block"
    >
      {/* desk surface */}
      <div
        className="absolute bottom-0 left-0 right-0 h-4 rounded-sm"
        style={{
          background:
            "linear-gradient(180deg, #c79b62 0%, #a07845 60%, #7a5631 100%)",
          boxShadow: "0 -2px 4px rgba(0,0,0,0.08)",
        }}
      />
      {/* paper stack */}
      <div
        className="absolute bottom-3 left-4 h-12 w-20 rotate-[-3deg] rounded-sm border border-os-window-border bg-white"
        style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.08)" }}
      />
      <div
        className="absolute bottom-4 left-6 h-12 w-20 rotate-[2deg] rounded-sm border border-os-window-border bg-white"
        style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.06)" }}
      />
      {/* coffee mug */}
      <div className="absolute bottom-3 left-32 flex flex-col items-center">
        <div
          className="h-2 w-7 rounded-full"
          style={{ background: "rgba(120, 80, 30, 0.8)" }}
        />
        <div
          className="-mt-0.5 h-9 w-10 rounded-b-md rounded-t-sm border border-os-accent"
          style={{
            background:
              "linear-gradient(180deg, #efe6d4 0%, #d6c79f 100%)",
          }}
        />
        <div
          className="absolute right-[-6px] top-2 h-5 w-3 rounded-r-md border border-os-accent"
          style={{ background: "transparent" }}
        />
        {/* steam */}
        <span
          aria-hidden
          className="absolute -top-3 left-3 h-2 w-2 rounded-full opacity-50"
          style={{ background: "rgba(255,255,255,0.8)" }}
        />
      </div>
      {/* plant */}
      <div className="absolute bottom-3 right-3 flex flex-col items-center">
        <div
          className="-mb-1 flex h-10 w-12 flex-wrap justify-center"
          style={{ position: "relative" }}
        >
          <span
            className="absolute left-1 top-1 h-6 w-3 rounded-full"
            style={{
              background: "linear-gradient(160deg, #6e9968, #3f6a3a)",
              transform: "rotate(-25deg)",
            }}
          />
          <span
            className="absolute left-4 top-0 h-7 w-3 rounded-full"
            style={{
              background: "linear-gradient(160deg, #7fa67a, #44704a)",
            }}
          />
          <span
            className="absolute right-1 top-1 h-6 w-3 rounded-full"
            style={{
              background: "linear-gradient(160deg, #6e9968, #3f6a3a)",
              transform: "rotate(25deg)",
            }}
          />
        </div>
        <div
          className="h-5 w-10 rounded-md border border-os-accent"
          style={{
            background:
              "linear-gradient(180deg, #c98b3b 0%, #8a5d28 100%)",
          }}
        />
      </div>
    </div>
  );
}
