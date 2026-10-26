import { useCallback, useEffect, useState } from "react";
import { getActivity } from "../lib/history";
import { DEMO_ACTIVITY, isDemo } from "../lib/demo";

/** Loads history lazily (only once `enabled`), merged with locally sent txs not yet indexed. */
export function useActivity(account, network, enabled, localTxs) {
  const [state, setState] = useState({ items: [], errors: [], loading: false, key: null });
  const [tick, setTick] = useState(0);
  const key = account ? `${network.id}:${account.index}` : null;

  useEffect(() => {
    if (!enabled || !account) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    const load = isDemo() ? Promise.resolve({ items: DEMO_ACTIVITY, errors: [] }) : getActivity(account, network);
    load.then(({ items, errors }) => !cancelled && setState({ items, errors, loading: false, key }));
    return () => {
      cancelled = true;
    };
  }, [enabled, account, network, key, tick]);

  const fresh = state.key === key;
  const known = new Set(state.items.map((i) => i.hash));
  const pending = localTxs.filter((t) => t.key === key && !known.has(t.hash));
  const items = fresh ? [...pending, ...state.items] : pending;

  return {
    items,
    errors: fresh ? state.errors : [],
    loading: state.loading || (enabled && !fresh),
    refresh: useCallback(() => setTick((t) => t + 1), []),
  };
}
