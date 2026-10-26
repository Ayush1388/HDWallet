import { useEffect, useId, useRef, useState } from "react";
import { coinIcon, fmtPrice, fmtQty, getDepth, subscribe } from "../lib/market";

export function CoinIcon({ symbol, size = "h-9 w-9" }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`${size} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-raised to-panel text-[10px] font-semibold text-fg ring-1 ring-white/10`} aria-hidden="true">
        {symbol.slice(0, 3)}
      </span>
    );
  }
  return <img src={coinIcon(symbol)} alt="" loading="lazy" onError={() => setFailed(true)} className={`${size} shrink-0 rounded-full bg-white/5`} />;
}

export function Pct({ value, className = "" }) {
  if (value == null || !isFinite(value)) return <span className={`text-muted ${className}`}>—</span>;
  return <span className={`font-medium tabular ${value >= 0 ? "text-up" : "text-down"} ${className}`}>{value >= 0 ? "+" : ""}{value.toFixed(2)}%</span>;
}

/** Tiny SVG sparkline; colour follows first→last direction. */
export function Spark({ points, className = "h-10 w-28", stroke }) {
  if (!points?.length) return <span className={`${className} skeleton block`} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const w = 100;
  const h = 32;
  const d = points.map((p, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * w).toFixed(2)},${(h - ((p - min) / (max - min || 1)) * (h - 4) - 2).toFixed(2)}`).join("");
  const color = stroke ?? (points.at(-1) >= points[0] ? "#3DD68C" : "#F26D6D");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Portfolio line: a smooth ice-blue stroke fading in from the left,
 * ending in a softly glowing point. Used for portfolio and hero previews.
 */
export function GlowLine({ points, className = "h-24 w-full" }) {
  const id = useId();
  if (!points?.length) return <span className={`${className} skeleton block`} />;
  const w = 300;
  const h = 100;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const xy = points.map((p, i) => [(i / (points.length - 1)) * (w - 12) + 4, h - 10 - ((p - min) / (max - min || 1)) * (h - 22)]);
  // Catmull-Rom -> cubic Bezier for a soft curve.
  let d = `M${xy[0][0]},${xy[0][1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const [p0, p1, p2, p3] = [xy[i - 1] ?? xy[i], xy[i], xy[i + 1], xy[i + 2] ?? xy[i + 1]];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  const [ex, ey] = xy.at(-1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`${className} overflow-visible`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}s`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#3B9EEA" stopOpacity=".55" />
          <stop offset=".6" stopColor="#7CC8FF" />
          <stop offset="1" stopColor="#D6F0FF" />
        </linearGradient>
        <filter id={`${id}g`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <path d={d} fill="none" stroke={`url(#${id}s)`} strokeWidth="6" opacity=".25" filter={`url(#${id}g)`} vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke={`url(#${id}s)`} strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={ex} cy={ey} r="8" fill="#7CC8FF" opacity=".4" filter={`url(#${id}g)`} />
      <circle cx={ex} cy={ey} r="3.2" fill="#EAF7FF" />
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
      <span className="relative text-right text-fg/75">{fmtQty(l.qty)}</span>
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
            <span className="text-right text-fg/75">{fmtQty(t.qty)}</span>
            <span className="text-right text-muted">{new Date(t.time).toLocaleTimeString("en-US", { hour12: false })}</span>
          </div>
        ))
      )}
    </div>
  );
}
