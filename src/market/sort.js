export const MARKET_TABS = [
  { id: "trending", label: "Trending" },
  { id: "gainers", label: "Gainers" },
  { id: "losers", label: "Losers" },
  { id: "volume", label: "Volume" },
];

export function sortTickers(list, tab) {
  const l = [...list];
  if (tab === "gainers") return l.sort((a, b) => b.change - a.change);
  if (tab === "losers") return l.sort((a, b) => a.change - b.change);
  if (tab === "volume") return l.sort((a, b) => b.quoteVolume - a.quoteVolume);
  return l.sort((a, b) => b.trades - a.trades);
}
