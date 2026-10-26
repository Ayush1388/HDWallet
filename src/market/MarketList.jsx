import { useMemo, useState } from "react";
import { fmtCompact, fmtPrice } from "../lib/market";
import { useSparklines, useTickers } from "./hooks";
import { CoinIcon, Pct, Spark } from "./parts";
import { MARKET_TABS, sortTickers } from "./sort";

export function MarketTabs({ tab, setTab, className = "" }) {
  return (
    <div className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`} role="tablist" aria-label="Market view">
      {MARKET_TABS.map((t) => (
        <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`chip shrink-0 ${tab === t.id ? "chip-on" : "chip-off"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Compact list for the wallet / extension (KuCoin-style rows). */
export function MarketList({ onOpen, limit }) {
  const { tickers, loading, error } = useTickers();
  const [tab, setTab] = useState("trending");
  const rows = useMemo(() => sortTickers(tickers, tab).slice(0, limit ?? tickers.length), [tickers, tab, limit]);

  return (
    <div>
      <MarketTabs tab={tab} setTab={setTab} className="mb-3" />
      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[60px] rounded-2xl" />)}</div>
      ) : error && !rows.length ? (
        <p className="py-8 text-center text-sm text-muted">Market data is unavailable right now.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <li key={t.pair}>
              <button onClick={() => onOpen(t.symbol)} className="flex w-full items-center gap-3 rounded-2xl border border-white/[.05] bg-white/[.025] px-3 py-2.5 text-left transition hover:border-white/15">
                <CoinIcon symbol={t.symbol} />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{t.symbol}</span>
                  <Pct value={t.change} className="text-xs font-semibold" />
                </span>
                <span className="text-right">
                  <span className="block font-bold tabular">{fmtPrice(t.price)}</span>
                  <span className="block text-xs text-muted tabular">Vol {fmtCompact(t.quoteVolume)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Full-width market table for the website. */
export function MarketTable({ onOpen, limit, search = "" }) {
  const { tickers, loading, error } = useTickers();
  const [tab, setTab] = useState("volume");
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? tickers.filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)) : tickers;
    return sortTickers(list, tab).slice(0, limit ?? list.length);
  }, [tickers, tab, limit, search]);
  const sparks = useSparklines(rows.map((r) => r.pair));

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-white/[.05] p-4"><MarketTabs tab={tab} setTab={setTab} /></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">24h Change</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell">24h High / Low</th>
              <th className="px-4 py-3 text-right font-medium">24h Volume</th>
              <th className="px-4 py-3 text-right font-medium">Last 7 days</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }, (_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-2"><div className="skeleton h-10" /></td></tr>
                ))
              : rows.map((t) => (
                  <tr key={t.pair} onClick={() => onOpen(t.symbol)} className="cursor-pointer border-t border-white/[.04] transition hover:bg-white/[.03]">
                    <td className="px-4 py-3">
                      <a href={`#/coin/${t.symbol}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                        <CoinIcon symbol={t.symbol} size="h-8 w-8" />
                        <span><span className="font-bold">{t.symbol}</span> <span className="text-muted">{t.name}</span></span>
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular">${fmtPrice(t.price)}</td>
                    <td className="px-4 py-3 text-right font-semibold"><Pct value={t.change} /></td>
                    <td className="hidden px-4 py-3 text-right text-muted tabular md:table-cell">{fmtPrice(t.high)} / {fmtPrice(t.low)}</td>
                    <td className="px-4 py-3 text-right tabular">${fmtCompact(t.quoteVolume)}</td>
                    <td className="px-4 py-3"><Spark points={sparks[t.pair]} className="ml-auto h-9 w-28" /></td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && error && !rows.length && <p className="p-8 text-center text-sm text-muted">Market data is unavailable right now.</p>}
        {!loading && !error && !rows.length && <p className="p-8 text-center text-sm text-muted">No coins match “{search}”.</p>}
      </div>
    </div>
  );
}
