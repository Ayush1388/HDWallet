/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./popup.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050506",
        panel: "#111113",
        raised: "#1a1a1d",
        line: "#26262b",
        muted: "#8d9099",
        accent: { DEFAULT: "#3cf27a", soft: "#8ff7b4", deep: "#14b85a", ink: "#03140a" },
        up: "#2ee07c",
        down: "#f6465d",
        eth: "#7d93f0",
        sol: "#14d9a0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glass: "inset 0 1px 0 0 rgba(255,255,255,.04)",
        pill: "inset 0 1px 0 0 rgba(255,255,255,.05)",
        glow: "0 0 0 1px rgba(60,242,122,.35), 0 10px 30px -8px rgba(60,242,122,.45)",
      },
      keyframes: {
        rise: { "0%": { opacity: 0, transform: "translateY(10px)" }, "100%": { opacity: 1, transform: "none" } },
        fade: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        sheet: { "0%": { transform: "translateY(100%)" }, "100%": { transform: "none" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        flashUp: { "0%": { backgroundColor: "rgba(46,224,124,.25)" }, "100%": { backgroundColor: "transparent" } },
        flashDown: { "0%": { backgroundColor: "rgba(246,70,93,.25)" }, "100%": { backgroundColor: "transparent" } },
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
