import { useEffect, useRef, useState } from "react";
import { coinIcon, fmtPrice, fmtQty, getDepth, subscribe } from "../lib/market";

export function CoinIcon({ symbol, size = "h-9 w-9" }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`${size} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-[10px] font-extrabold text-zinc-100 ring-1 ring-white/10`} aria-hidden="true">
        {symbol.slice(0, 3)}
      </span>
    );
  }
  return <img src={coinIcon(symbol)} alt="" loading="lazy" onError={() => setFailed(true)} className={`${size} shrink-0 rounded-full bg-white/5`} />;
}

export function Pct({ value, className = "" }) {
  if (value == null || !isFinite(value)) return <span className={`text-muted ${className}`}>—</span>;
  return <span className={`tabular ${value >= 0 ? "text-up" : "text-down"} ${className}`}>{value >= 0 ? "+" : ""}{value.toFixed(2)}%</span>;
}

/** Tiny SVG sparkline; colour follows first→last direction. */
export function Spark({ points, className = "h-10 w-28", stroke }) {
  if (!points?.length) return <span className={`${className} skeleton block`} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const w = 100;
  const h = 32;
  const d = points.map((p, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * w).toFixed(2)},${(h - ((p - min) / (max - min || 1)) * (h - 4) - 2).toFixed(2)}`).join("");
  const color = stroke ?? (points.at(-1) >= points[0] ? "#2ee07c" : "#f6465d");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Price text that flashes green/red on change. */
export function LivePrice({ value, className = "" }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (prev.current != null && value != null && value !== prev.current) setFlash(value > prev.current ? "animate-flashUp" : "animate-flashDown");
    prev.current = value;
    const t = setTimeout(() => setFlash(""), 800);
    return () => clearTimeout(t);
  }, [value]);
  return <span className={`tabular rounded-md px-1 -mx-1 ${flash} ${className}`}>{fmtPrice(value)}</span>;
}

/** Live order book (top N levels) with cumulative depth bars. */
export function OrderBook({ pair, rows = 10, lastPrice, change }) {
  const [book, setBook] = useState(null);
  useEffect(() => {
    let live = true;
    setBook(null);
    getDepth(pair, 20).then((b) => live && setBook(b)).catch(() => {});
    const unsub = subscribe(`${pair.toLowerCase()}@depth20@1000ms`, (m) => {
      const map = (r) => r.map(([p, q]) => ({ price: +p, qty: +q }));
      setBook({ bids: map(m.bids), asks: map(m.asks) });
    });
    return () => {
      live = false;
      unsub();
    };
  }, [pair]);

  if (!book) return <div className="space-y-1.5 p-1">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-5" />)}</div>;

  const asks = book.asks.slice(0, rows);
  const bids = book.bids.slice(0, rows);
  const cum = (list) => list.reduce((acc, l) => [...acc, (acc.at(-1) ?? 0) + l.qty], []);
  const askCum = cum(asks);
  const bidCum = cum(bids);
  const max = Math.max(askCum.at(-1) ?? 0, bidCum.at(-1) ?? 0) || 1;

  const Row = ({ l, total, side }) => (
    <div className="relative grid grid-cols-3 gap-2 px-2 py-[3px] text-xs tabular">
      <span className={`absolute inset-y-0 right-0 ${side === "ask" ? "bg-down/10" : "bg-up/10"}`} style={{ width: `${(total / max) * 100}%` }} />
      <span className={`relative ${side === "ask" ? "text-down" : "text-up"}`}>{fmtPrice(l.price)}</span>
      <span className="relative text-right text-zinc-300">{fmtQty(l.qty)}</span>
      <span className="relative text-right text-muted">{fmtQty(total)}</span>
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 px-2 pb-1.5 text-[11px] text-muted">
        <span>Price (USDT)</span><span className="text-right">Amount</span><span className="text-right">Total</span>
      </div>
      <div className="flex flex-col-reverse">
        {asks.map((l, i) => <Row key={`a${l.price}`} l={l} total={askCum[i]} side="ask" />)}
      </div>
      <div className="flex items-baseline gap-2 border-y border-white/[.05] px-2 py-2">
        <span className={`text-lg font-bold tabular ${change >= 0 ? "text-up" : "text-down"}`}>{fmtPrice(lastPrice ?? bids[0]?.price)}</span>
        <span className="text-xs text-muted">Spread {fmtPrice((asks[0]?.price ?? 0) - (bids[0]?.price ?? 0))}</span>
      </div>
      {bids.map((l, i) => <Row key={`b${l.price}`} l={l} total={bidCum[i]} side="bid" />)}
    </div>
  );
}

export function RecentTrades({ pair, rows = 18 }) {
  const [trades, setTrades] = useState([]);
  useEffect(() => {
    setTrades([]);
    return subscribe(`${pair.toLowerCase()}@trade`, (m) =>
      setTrades((t) => [{ id: m.t, price: +m.p, qty: +m.q, time: m.T, sell: m.m }, ...t].slice(0, rows)),
    );
  }, [pair, rows]);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 px-2 pb-1.5 text-[11px] text-muted">
        <span>Price (USDT)</span><span className="text-right">Amount</span><span className="text-right">Time</span>
      </div>
      {trades.length === 0 ? (
        <p className="px-2 py-6 text-center text-xs text-muted">Waiting for trades…</p>
      ) : (
        trades.map((t) => (
          <div key={t.id} className="grid grid-cols-3 gap-2 px-2 py-[3px] text-xs tabular">
            <span className={t.sell ? "text-down" : "text-up"}>{fmtPrice(t.price)}</span>
            <span className="text-right text-zinc-300">{fmtQty(t.qty)}</span>
            <span className="text-right text-muted">{new Date(t.time).toLocaleTimeString("en-US", { hour12: false })}</span>
          </div>
        ))
      )}
    </div>
  );
}
