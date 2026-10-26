// Public market data from Binance's market-data mirror (no key, CORS enabled, not geo-blocked).
const REST = "https://data-api.binance.vision/api/v3";
const WS = "wss://data-stream.binance.vision/ws";

export const COINS = [
  ["BTC", "Bitcoin"], ["ETH", "Ethereum"], ["SOL", "Solana"], ["BNB", "BNB"], ["XRP", "XRP"],
  ["DOGE", "Dogecoin"], ["ADA", "Cardano"], ["AVAX", "Avalanche"], ["LINK", "Chainlink"], ["DOT", "Polkadot"],
  ["TRX", "TRON"], ["TON", "Toncoin"], ["POL", "Polygon"], ["SHIB", "Shiba Inu"], ["LTC", "Litecoin"],
  ["BCH", "Bitcoin Cash"], ["UNI", "Uniswap"], ["ATOM", "Cosmos"], ["NEAR", "NEAR"], ["APT", "Aptos"],
  ["ARB", "Arbitrum"], ["OP", "Optimism"], ["SUI", "Sui"], ["PEPE", "Pepe"], ["INJ", "Injective"],
  ["FIL", "Filecoin"], ["AAVE", "Aave"], ["ETC", "Ethereum Classic"], ["XLM", "Stellar"], ["HBAR", "Hedera"],
  ["BONK", "Bonk"], ["JUP", "Jupiter"], ["WIF", "dogwifhat"], ["RENDER", "Render"], ["TIA", "Celestia"],
].map(([symbol, name]) => ({ symbol, name, pair: `${symbol}USDT` }));

export const COIN_BY_SYMBOL = Object.fromEntries(COINS.map((c) => [c.symbol, c]));

export const INTERVALS = [
  { id: "1m", label: "1m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1H" },
  { id: "4h", label: "4H" },
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" },
];

async function get(path, params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${REST}${path}?${qs}`);
  if (!res.ok) throw new Error(`market data ${res.status}`);
  return res.json();
}

const toTicker = (t) => ({
  pair: t.symbol,
  symbol: t.symbol.replace(/USDT$/, ""),
  price: +t.lastPrice,
  open: +t.openPrice,
  high: +t.highPrice,
  low: +t.lowPrice,
  change: +t.priceChangePercent,
  volume: +t.volume,
  quoteVolume: +t.quoteVolume,
  trades: +t.count,
});

/** 24h stats for every listed coin. */
export async function getTickers() {
  const rows = await get("/ticker/24hr", { symbols: JSON.stringify(COINS.map((c) => c.pair)) });
  return rows.map(toTicker).map((t) => ({ ...t, name: COIN_BY_SYMBOL[t.symbol]?.name ?? t.symbol }));
}

export async function getTicker(pair) {
  return toTicker(await get("/ticker/24hr", { symbol: pair }));
}

/** Candles: { time (unix s), open, high, low, close, volume } */
export async function getKlines(pair, interval = "1h", limit = 300) {
  const rows = await get("/klines", { symbol: pair, interval, limit });
  return rows.map((k) => ({ time: k[0] / 1000, open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }));
}

/** Closing prices only, for sparklines. */
export const getSparkline = (pair, interval = "4h", limit = 42) => getKlines(pair, interval, limit).then((k) => k.map((c) => c.close));

export async function getDepth(pair, limit = 12) {
  const d = await get("/depth", { symbol: pair, limit });
  const map = (rows) => rows.map(([p, q]) => ({ price: +p, qty: +q }));
  return { bids: map(d.bids), asks: map(d.asks) };
}

/**
 * Subscribe to a raw Binance stream (e.g. "btcusdt@kline_1m"). Reconnects with backoff.
 * Returns an unsubscribe function.
 */
export function subscribe(stream, onMessage) {
  let ws;
  let closed = false;
  let retry = 0;
  let timer;
  const open = () => {
    ws = new WebSocket(`${WS}/${stream}`);
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onopen = () => (retry = 0);
    ws.onclose = () => {
      if (closed) return;
      timer = setTimeout(open, Math.min(30000, 1000 * 2 ** retry++));
    };
  };
  open();
  return () => {
    closed = true;
    clearTimeout(timer);
    ws.onmessage = null;
    // Closing mid-handshake logs a browser warning; close once it opens instead.
    if (ws.readyState === WebSocket.CONNECTING) ws.onopen = () => ws.close();
    else ws.close();
  };
}

/** Coin logo URL (falls back to a letter avatar in the UI on error). */
export const coinIcon = (symbol) =>
  `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@0.18.1/svg/color/${symbol.toLowerCase()}.svg`;

/** Price formatting with precision that suits the magnitude (BTC vs PEPE). */
export function fmtPrice(n) {
  if (n == null || !isFinite(n)) return "—";
  const digits = n >= 1000 ? 2 : n >= 1 ? 4 : n >= 0.01 ? 5 : 8;
  return n.toLocaleString("en-US", { minimumFractionDigits: Math.min(2, digits), maximumFractionDigits: digits });
}

/** Order sizes: compact when large, precise when tiny (0.00012 BTC must not read as 0). */
export function fmtQty(n) {
  if (n == null || !isFinite(n)) return "—";
  if (n >= 1000) return fmtCompact(n);
  return n.toLocaleString("en-US", { maximumFractionDigits: n >= 1 ? 2 : 5 });
}

export function fmtCompact(n) {
  if (n == null || !isFinite(n)) return "—";
  return n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
}
