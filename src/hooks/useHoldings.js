import { useCallback, useEffect, useMemo, useState } from "react";
import { getHoldings, getPrices } from "../lib/chains";
import { DEMO_HOLDINGS, DEMO_PRICES, isDemo } from "../lib/demo";

const REFRESH_MS = 30_000;

/**
 * Holdings for one account on one network, priced in USD with 24h change.
 * Testnet assets are valued at $0.
 */
export function useHoldings(account, network) {
  const [state, setState] = useState({ holdings: [], prices: {}, loading: true, issues: [], key: null });
  const [tick, setTick] = useState(0);
  const key = account ? `${network.id}:${account.index}` : null;

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    const run = async () => {
      setState((s) => ({ ...s, loading: true }));
      if (isDemo()) {
        if (!cancelled) setState({ holdings: DEMO_HOLDINGS, prices: DEMO_PRICES, loading: false, issues: [], key });
        return;
      }
      const { holdings, issues } = await getHoldings(account, network);
      const prices = await getPrices(holdings.map((h) => h.priceId)).catch(() => null);
      if (cancelled) return;
      setState((s) => ({
        holdings,
        prices: prices ?? (s.key === key ? s.prices : {}),
        loading: false,
        issues: prices ? issues : [...issues, "prices"],
        key,
      }));
    };
    run();
    const id = setInterval(run, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [account, network, key, tick]);

  const stale = state.key !== key;
  const rows = useMemo(() => {
    if (stale) return [];
    return state.holdings.map((h) => {
      const p = state.prices[h.priceId];
      const price = network.id === "testnet" && !isDemo() ? 0 : p?.usd ?? 0;
      return { ...h, price, change: p?.usd_24h_change ?? null, usd: h.balance * price };
    });
  }, [state, network.id, stale]);

  const totals = useMemo(() => {
    const usd = rows.reduce((s, r) => s + r.usd, 0);
    // Value 24h ago = usd / (1 + change%), summed per asset.
    const delta = rows.reduce((s, r) => s + (r.change == null ? 0 : r.usd - r.usd / (1 + r.change / 100)), 0);
    const base = usd - delta;
    return { usd, delta, pct: base > 0 ? (delta / base) * 100 : 0 };
  }, [rows]);

  return {
    rows,
    totals,
    loading: state.loading || stale,
    issues: stale ? [] : state.issues,
    refresh: useCallback(() => setTick((t) => t + 1), []),
  };
}
