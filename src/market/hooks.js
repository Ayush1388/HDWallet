import { useEffect, useState } from "react";
import { getSparkline, getTickers, subscribe } from "../lib/market";

/** All listed tickers, refreshed every `ms`. */
export function useTickers(ms = 10_000) {
  const [state, setState] = useState({ tickers: [], loading: true, error: false });
  useEffect(() => {
    let live = true;
    const run = () =>
      getTickers()
        .then((tickers) => live && setState({ tickers, loading: false, error: false }))
        .catch(() => live && setState((s) => ({ ...s, loading: false, error: true })));
    run();
    const id = setInterval(run, ms);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [ms]);
  return state;
}

const sparkCache = new Map();

/** 7-day closing prices per pair, cached for the session. */
export function useSparklines(pairs) {
  const [data, setData] = useState(() => Object.fromEntries(pairs.filter((p) => sparkCache.has(p)).map((p) => [p, sparkCache.get(p)])));
  const key = pairs.join(",");
  useEffect(() => {
    let live = true;
    const todo = key.split(",").filter((p) => p && !sparkCache.has(p));
    // Small batches keep us well inside Binance's request weight limits.
    (async () => {
      for (let i = 0; i < todo.length; i += 6) {
        const batch = todo.slice(i, i + 6);
        const res = await Promise.allSettled(batch.map((p) => getSparkline(p)));
        res.forEach((r, j) => r.status === "fulfilled" && sparkCache.set(batch[j], r.value));
        if (!live) return;
        setData(Object.fromEntries(key.split(",").filter((p) => sparkCache.has(p)).map((p) => [p, sparkCache.get(p)])));
      }
    })();
    return () => {
      live = false;
    };
  }, [key]);
  return data;
}

/** Rolling 24h ticker for one pair over websocket. */
export function useLiveTicker(pair) {
  const [t, setT] = useState(null);
  useEffect(() => {
    setT(null);
    return subscribe(`${pair.toLowerCase()}@ticker`, (m) =>
      setT({ price: +m.c, change: +m.P, high: +m.h, low: +m.l, volume: +m.v, quoteVolume: +m.q, open: +m.o }),
    );
  }, [pair]);
  return t;
}
