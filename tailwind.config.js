/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-brand-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-brand-secondary) / <alpha-value>)",
        foreground: "rgb(var(--color-text-base) / <alpha-value>)",
        brand: "rgb(var(--color-brand-primary) / <alpha-value>)",
        accent: "rgb(var(--color-brand-secondary) / <alpha-value>)",
        app: {
          bg: "rgb(var(--color-surface-app) / <alpha-value>)",
          panel: "rgb(var(--color-surface-panel) / <alpha-value>)",
          muted: "rgb(var(--color-surface-muted) / <alpha-value>)",
        },
        os: {
          wallpaper: "var(--os-wallpaper-base)",
          window: "var(--os-window-bg)",
          "window-border": "var(--os-window-border)",
          "window-border-focused": "var(--os-window-border-focused)",
          titlebar: "var(--os-titlebar-bg)",
          "titlebar-focused": "var(--os-titlebar-bg-focused)",
          dock: "var(--os-dock-bg)",
          menu: "var(--os-menu-bg)",
          ink: "var(--os-ink)",
          "ink-muted": "var(--os-ink-muted)",
          accent: "var(--os-accent-warm)",
        },
      },
      boxShadow: {
        "os-window": "var(--os-window-shadow)",
      },
      backgroundImage: {
        dot: "url('/assets/dots.svg')",
        "os-grain": "var(--os-wallpaper-grain)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  corePlugins: {
    aspectRatio: false,
  },
  plugins: [
    require("tailwind-scrollbar")({ nocompatible: true }),
    require("@tailwindcss/aspect-ratio"),
  ],
};
