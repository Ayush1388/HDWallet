/** @type {import('tailwindcss').Config} */
// Monochrome, Apple-style: black, greys and white everywhere. Colour is reserved for
// meaning only — green for charts / positive moves, red for negative moves.
export default {
  content: ["./index.html", "./popup.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Extension (dark)
        ink: "#000000",
        panel: "#1C1C1E",
        raised: "#2C2C2E",
        line: "#3A3A3C",
        muted: "#8E8E93",
        fg: { DEFAULT: "#F5F5F7", dim: "#D1D1D6" },
        accent: { DEFAULT: "#FFFFFF", soft: "#E5E5EA", deep: "#D1D1D6", ink: "#000000" },
        up: "#30D158",
        down: "#FF453A",
        eth: "#627EEA",
        sol: "#14F195",
        // Website (light / dark alternating sections)
        site: { bg: "#F5F5F7", card: "#FFFFFF", ink: "#1D1D1F", muted: "#6E6E73", line: "#D2D2D7", dark: "#000000", dark2: "#161617" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: { tightest: "-0.03em", display: "-0.04em" },
      boxShadow: {
        glass: "inset 0 1px 0 0 rgba(255,255,255,.04)",
        pill: "inset 0 1px 0 0 rgba(255,255,255,.05)",
        glow: "0 0 0 1px rgba(255,255,255,.18), 0 10px 30px -10px rgba(255,255,255,.25)",
        lift: "0 30px 60px -30px rgba(0,0,0,.35)",
        dock: "0 18px 40px -12px rgba(0,0,0,.8)",
      },
      keyframes: {
        rise: { "0%": { opacity: 0, transform: "translateY(10px)" }, "100%": { opacity: 1, transform: "none" } },
        fade: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        sheet: { "0%": { transform: "translateY(100%)" }, "100%": { transform: "none" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        flashUp: { "0%": { backgroundColor: "rgba(48,209,88,.22)" }, "100%": { backgroundColor: "transparent" } },
        flashDown: { "0%": { backgroundColor: "rgba(255,69,58,.22)" }, "100%": { backgroundColor: "transparent" } },
        lineUp: { "0%": { opacity: 0, transform: "translateY(105%)" }, "100%": { opacity: 1, transform: "none" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        orbit: { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
        counter: { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(-360deg)" } },
        nudge: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(6px)" } },
        ping: { "75%,100%": { transform: "scale(2.2)", opacity: 0 } },
      },
      animation: {
        rise: "rise .5s cubic-bezier(.2,.8,.2,1) both",
        fade: "fade .2s ease-out both",
        sheet: "sheet .32s cubic-bezier(.2,.8,.2,1) both",
        shimmer: "shimmer 1.6s linear infinite",
        flashUp: "flashUp .8s ease-out",
        flashDown: "flashDown .8s ease-out",
        lineUp: "lineUp 1s cubic-bezier(.2,.8,.2,1) both",
        marquee: "marquee 50s linear infinite",
        orbit: "orbit 80s linear infinite",
        counter: "counter 80s linear infinite",
        nudge: "nudge 2s ease-in-out infinite",
        ping: "ping 1.6s cubic-bezier(0,0,.2,1) infinite",
      },
    },
  },
  plugins: [],
}
