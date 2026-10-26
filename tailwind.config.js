/** @type {import('tailwindcss').Config} */
// Obsidian + ice blue: cool-neutral blacks, crisp white type, a single ice-blue accent.
export default {
  content: ["./index.html", "./popup.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0B0D",
        panel: "#111317",
        raised: "#181B20",
        line: "#23272E",
        muted: "#8A919C",
        fg: { DEFAULT: "#F4F6F8", dim: "#C9D1DA" },
        accent: { DEFAULT: "#7CC8FF", soft: "#B8E4FF", deep: "#3B9EEA", ink: "#06121C" },
        up: "#3DD68C",
        down: "#F26D6D",
        eth: "#8A9BF0",
        sol: "#2FD6A8",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: { tightest: "-0.035em" },
      boxShadow: {
        glass: "inset 0 1px 0 0 rgba(226,236,255,.05)",
        pill: "inset 0 1px 0 0 rgba(226,236,255,.06)",
        glow: "0 0 0 1px rgba(124,200,255,.35), 0 0 24px -6px rgba(124,200,255,.45)",
        dock: "0 18px 40px -12px rgba(0,0,0,.85), inset 0 1px 0 0 rgba(226,236,255,.06)",
      },
      keyframes: {
        rise: { "0%": { opacity: 0, transform: "translateY(10px)" }, "100%": { opacity: 1, transform: "none" } },
        fade: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        sheet: { "0%": { transform: "translateY(100%)" }, "100%": { transform: "none" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        flashUp: { "0%": { backgroundColor: "rgba(61,214,140,.22)" }, "100%": { backgroundColor: "transparent" } },
        flashDown: { "0%": { backgroundColor: "rgba(242,109,109,.22)" }, "100%": { backgroundColor: "transparent" } },
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
