/** @type {import('tailwindcss').Config} */
// Phantom-derived palette (taste analysis of phantom.com):
// graphite app surfaces, cream text, lavender accent, deep-purple ink on lavender.
export default {
  content: ["./index.html", "./popup.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A1A1A",
        panel: "#232323",
        raised: "#2C2C2C",
        line: "#383838",
        muted: "#8E8C94",
        fg: { DEFAULT: "#FFFDF8", dim: "#D8D4E6" },
        accent: { DEFAULT: "#AB9FF2", soft: "#E2DFFE", deep: "#8A7BE6", ink: "#3C315B" },
        up: "#3CCB8B",
        down: "#F2665E",
        eth: "#8A9BF0",
        sol: "#2FD6A8",
        // Marketing site (light, colour-blocked)
        site: { bg: "#FDFCFE", soft: "#F4F2F4", ink: "#3C315B", muted: "#6E6A7C", lav: "#AB9FF2", lavsoft: "#E2DFFE", dark: "#1C1C1C", cream: "#FFFDF8" },
      },
      fontFamily: {
        sans: ["Instrument Sans", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: { tightest: "-0.03em", display: "-0.025em" },
      transitionTimingFunction: { phantom: "cubic-bezier(0.22, 1, 0.36, 1)" },
      boxShadow: {
        glass: "inset 0 1px 0 0 rgba(255,253,248,.04)",
        pill: "inset 0 1px 0 0 rgba(255,253,248,.05)",
        glow: "0 0 0 4px rgba(226,223,254,.18)",
        dock: "0 18px 40px -12px rgba(0,0,0,.7)",
      },
      keyframes: {
        rise: { "0%": { opacity: 0, transform: "translateY(10px)" }, "100%": { opacity: 1, transform: "none" } },
        fade: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        sheet: { "0%": { transform: "translateY(100%)" }, "100%": { transform: "none" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        flashUp: { "0%": { backgroundColor: "rgba(60,203,139,.22)" }, "100%": { backgroundColor: "transparent" } },
        flashDown: { "0%": { backgroundColor: "rgba(242,102,94,.22)" }, "100%": { backgroundColor: "transparent" } },
      },
      animation: {
        rise: "rise .4s cubic-bezier(.22,1,.36,1) both",
        fade: "fade .2s ease-out both",
        sheet: "sheet .4s cubic-bezier(.22,1,.36,1) both",
        shimmer: "shimmer 1.6s linear infinite",
        flashUp: "flashUp .8s ease-out",
        flashDown: "flashDown .8s ease-out",
      },
    },
  },
  plugins: [],
}
