/**
 * `<Wallpaper>` — purely decorative, paper-textured background that fills the
 * entire desktop area below the top menu bar (plan §4.1).
 *
 * Implemented in pure CSS so we don't ship an image asset; the
 * `--os-wallpaper-base` and `--os-wallpaper-grain` tokens (defined in
 * `globals.css`) drive the look. A subtle multi-layer radial gradient gives
 * the impression of woven paper grain without crashing rendering performance.
 *
 * No interactive content lives here — the icon grid and ambient art are
 * sibling layers in `<Desktop>`.
 */

"use client";

export function Wallpaper() {
  return (
    <div
      data-testid="os-wallpaper"
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-os-wallpaper bg-os-grain"
      style={{
        // Tile the grain at a comfortable size; CSS variables drive the
        // image so theming is one-token-flip away.
        backgroundSize: "100% 100%, 100% 100%, 100% 100%",
      }}
    />
  );
}
