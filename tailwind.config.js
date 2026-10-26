/** @type {import('tailwindcss').Config} */
// Palette measured from the reference shot: warm near-black base, cream text,
// and an ember gradient (gold → orange → red) reserved for strokes, glows and icons.
export default {
  content: ["./index.html", "./popup.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080808",
        panel: "#121010",
        raised: "#1A1614",
        line: "#2A2320",
        muted: "#8A7F75",
        cream: { DEFAULT: "#EFE6DC", dim: "#D9C4B4" },
        accent: { DEFAULT: "#FF8A3D", soft: "#FCCE54", deep: "#E5352B", ink: "#140A04" },
        up: "#3FCB7E",
        down: "#F0524A",
        eth: "#8A9BF0",
        sol: "#2FD6A8",
      },
      fontFamily: {
        sans: ["Urbanist", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glass: "inset 0 1px 0 0 rgba(255,236,220,.05)",
        pill: "inset 0 1px 0 0 rgba(255,236,220,.06)",
        glow: "0 0 0 1px rgba(255,138,61,.35), 0 0 24px -4px rgba(255,138,61,.45)",
        dock: "0 18px 40px -12px rgba(0,0,0,.8), inset 0 1px 0 0 rgba(255,236,220,.06)",
      },
      keyframes: {
        rise: { "0%": { opacity: 0, transform: "translateY(10px)" }, "100%": { opacity: 1, transform: "none" } },
        fade: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        sheet: { "0%": { transform: "translateY(100%)" }, "100%": { transform: "none" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        flashUp: { "0%": { backgroundColor: "rgba(63,203,126,.22)" }, "100%": { backgroundColor: "transparent" } },
        flashDown: { "0%": { backgroundColor: "rgba(240,82,74,.22)" }, "100%": { backgroundColor: "transparent" } },
      },
      animation: {
        rise: "rise .4s cubic-bezier(.2,.8,.2,1) both",
        fade: "fade .2s ease-out both",
        sheet: "sheet .32s cubic-bezier(.2,.8,.2,1) both",
        shimmer: "shimmer 1.6s linear infinite",
        flashUp: "flashUp .8s ease-out",
        flashDown: "flashDown .8s ease-out",
      },
    },
  },
  plugins: [],
}
