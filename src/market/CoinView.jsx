import { useState } from "react";
import { Icon } from "../components/ui";
import { COIN_BY_SYMBOL, INTERVALS, fmtCompact, fmtPrice } from "../lib/market";
import { useLiveTicker } from "./hooks";
import { PriceChart } from "./PriceChart";
import { CoinIcon, LivePrice, OrderBook, Pct, RecentTrades } from "./parts";

function Toolbar({ interval, setInterval, type, setType, compact }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/[.05] px-3 py-2">
      <div className="no-scrollbar flex gap-1 overflow-x-auto" role="tablist" aria-label="Timeframe">
        {INTERVALS.map((i) => (
          <button
            key={i.id}
            role="tab"
            aria-selected={interval === i.id}
            onClick={() => setInterval(i.id)}
            className={`min-h-[32px] rounded-lg px-2.5 text-xs font-semibold transition ${interval === i.id ? "bg-raised text-fg" : "text-muted hover:text-fg"}`}
          >
            {i.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 rounded-lg bg-white/[.04] p-0.5" role="group" aria-label="Chart type">
        {[["candles", "Candles", "bars"], ["line", "Line", "chart"]].map(([id, label, icon]) => (
          <button key={id} aria-pressed={type === id} aria-label={label} onClick={() => setType(id)} className={`min-h-[28px] rounded-md px-2.5 text-xs font-semibold transition ${type === id ? "bg-raised text-fg shadow-pill" : "text-muted hover:text-fg"}`}>
            {compact ? <Icon name={icon} className="h-3.5 w-3.5" /> : label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stats({ t, compact }) {
  const items = [
    ["24h High", fmtPrice(t?.high)],
    ["24h Low", fmtPrice(t?.low)],
    ["24h Vol", fmtCompact(t?.volume)],
    ["24h Vol (USDT)", fmtCompact(t?.quoteVolume)],
  ];
  return (
    <dl className={`grid ${compact ? "grid-cols-2 gap-x-4 gap-y-2" : "grid-cols-2 gap-x-8 gap-y-1 sm:flex sm:gap-8"}`}>
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[11px] text-muted">{k}</dt>
          <dd className="text-sm font-semibold tabular">{t ? v : <span className="skeleton inline-block h-4 w-16 align-middle" />}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A coin's market page. `variant="full"` is the Binance-style website layout;
 * `variant="compact"` stacks chart, stats and order book for the extension/mobile.
 */
export function CoinView({ symbol, variant = "full", actions }) {
  const coin = COIN_BY_SYMBOL[symbol] ?? { symbol, name: symbol, pair: `${symbol}USDT` };
  const t = useLiveTicker(coin.pair);
  const [interval, setTf] = useState("1h");
  const [type, setType] = useState("candles");
  const compact = variant === "compact";

  const header = (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 ${compact ? "" : "px-1"}`}>
      <div className="flex items-center gap-3">
        <CoinIcon symbol={coin.symbol} size={compact ? "h-10 w-10" : "h-11 w-11"} />
        <div>
          <h1 className={`${compact ? "text-lg" : "text-xl"} font-bold`}>{coin.symbol}<span className="text-muted">/USDT</span></h1>
          <p className="text-xs text-muted">{coin.name}</p>
        </div>
      </div>
      <div>
        <p className={`${compact ? "text-2xl" : "text-3xl"} font-semibold ${t ? (t.change >= 0 ? "text-up" : "text-down") : ""}`}>
          {t ? <LivePrice value={t.price} /> : <span className="skeleton inline-block h-8 w-36 align-middle" />}
        </p>
        <p className="text-xs text-muted">≈ ${fmtPrice(t?.price)} <Pct value={t?.change} className="ml-1 font-semibold" /></p>
      </div>
      {!compact && <div className="ml-auto"><Stats t={t} /></div>}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        {header}
        {actions}
        <section className="card overflow-hidden">
          <Toolbar {...{ interval, setInterval: setTf, type, setType }} compact />
          <PriceChart pair={coin.pair} interval={interval} type={type} height={280} compact />
        </section>
        <section className="card p-4"><Stats t={t} compact /></section>
        <section className="card p-3">
          <h2 className="mb-2 px-2 text-sm font-bold">Order book</h2>
          <OrderBook pair={coin.pair} rows={8} lastPrice={t?.price} change={t?.change} />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="card p-4 sm:p-5">{header}</section>
      {actions}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card overflow-hidden">
          <Toolbar {...{ interval, setInterval: setTf, type, setType }} />
          <PriceChart pair={coin.pair} interval={interval} type={type} height={520} />
        </section>
        <section className="card p-3">
          <h2 className="mb-2 px-2 text-sm font-bold">Order book</h2>
          <OrderBook pair={coin.pair} rows={12} lastPrice={t?.price} change={t?.change} />
        </section>
      </div>
      <section className="card p-3 lg:max-w-[calc(100%-336px)]">
        <h2 className="mb-2 px-2 text-sm font-bold">Market trades</h2>
        <RecentTrades pair={coin.pair} rows={14} />
      </section>
    </div>
  );
}
