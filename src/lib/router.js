// Minimal hash router: works on static hosting and inside the extension popup.
import { useEffect, useState } from "react";

const current = () => window.location.hash.replace(/^#/, "") || "/";

export function useRoute() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const on = () => {
      setPath(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return path;
}

export const navigate = (path) => {
  window.location.hash = path;
};

/** "/coin/:symbol" against "/coin/BTC" -> { symbol: "BTC" } or null */
export function match(pattern, path) {
  const p = pattern.split("/");
  const a = path.split("?")[0].split("/");
  if (p.length !== a.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}
