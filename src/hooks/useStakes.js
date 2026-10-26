import { useCallback, useEffect, useState } from "react";
import { getStakeAccounts } from "../lib/staking";
import { isDemo } from "../lib/demo";

/** Solana stake accounts owned by the account. `error` is set when the RPC refuses the query. */
export function useStakes(account, network) {
  const [state, setState] = useState({ stakes: [], loading: true, error: false, key: null });
  const [tick, setTick] = useState(0);
  const key = account ? `${network.id}:${account.sol.address}` : null;

  useEffect(() => {
    if (!account) return;
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    // Free mainnet RPCs reject getProgramAccounts; don't spam them with requests that can't succeed.
    const blocked = network.id === "mainnet" && !network.sol.custom;
    const load = isDemo() ? Promise.resolve([]) : blocked ? Promise.reject(new Error("rpc")) : getStakeAccounts(network, account.sol.address);
    load
      .then(
        (stakes) => live && setState({ stakes, loading: false, error: false, key }),
        () => live && setState({ stakes: [], loading: false, error: true, key }),
      );
    return () => {
      live = false;
    };
  }, [account, network, key, tick]);

  const fresh = state.key === key;
  return {
    stakes: fresh ? state.stakes : [],
    loading: state.loading || !fresh,
    error: fresh && state.error,
    refresh: useCallback(() => setTick((t) => t + 1), []),
  };
}
