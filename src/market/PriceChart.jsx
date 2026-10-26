import { useEffect, useRef, useState } from "react";
import { AreaSeries, CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, createChart } from "lightweight-charts";
import { getKlines, subscribe } from "../lib/market";

const UP = "#3DD68C";
const DOWN = "#F26D6D";

const precisionFor = (p) => (p >= 1000 ? 2 : p >= 1 ? 4 : p >= 0.01 ? 6 : 8);

/**
 * Binance-style candlestick (or area) chart with volume, live-updated over websocket.
 * TradingView Lightweight Charts™ — attribution logo kept per its license.
 */
export function PriceChart({ pair, interval = "1h", type = "candles", height = 420, compact = false }) {
  const el = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const chart = createChart(el.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8D9099",
        fontFamily: "Geist Mono, ui-monospace, monospace",
        fontSize: compact ? 10 : 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,.04)" },
        horzLines: { color: "rgba(255,255,255,.04)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,.08)" },
      timeScale: { borderColor: "rgba(255,255,255,.08)", timeVisible: interval !== "1d" && interval !== "1w", secondsVisible: false, rightOffset: 4 },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,.25)", labelBackgroundColor: "#26262B" },
        horzLine: { color: "rgba(255,255,255,.25)", labelBackgroundColor: "#26262B" },
      },
      handleScroll: !compact || { horzTouchDrag: true, vertTouchDrag: false },
    });

    const main =
      type === "candles"
        ? chart.addSeries(CandlestickSeries, { upColor: UP, downColor: DOWN, borderVisible: false, wickUpColor: UP, wickDownColor: DOWN })
        : chart.addSeries(AreaSeries, { lineColor: "#3CF27A", topColor: "rgba(60,242,122,.26)", bottomColor: "rgba(60,242,122,0)", lineWidth: 2 });
    main.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.24 } });

    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol", lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    const toMain = (c) => (type === "candles" ? c : { time: c.time, value: c.close });
    const toVol = (c) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? "rgba(46,224,124,.32)" : "rgba(246,70,93,.32)" });

    let unsub = () => {};
    let dead = false;
    setStatus("loading");
    getKlines(pair, interval, compact ? 150 : 400)
      .then((candles) => {
        if (dead) return;
        const p = precisionFor(candles.at(-1)?.close ?? 1);
        main.applyOptions({ priceFormat: { type: "price", precision: p, minMove: 10 ** -p } });
        main.setData(candles.map(toMain));
        vol.setData(candles.map(toVol));
        const n = candles.length;
        chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - (compact ? 70 : 130)), to: n + 3 });
        setStatus("ready");
        unsub = subscribe(`${pair.toLowerCase()}@kline_${interval}`, ({ k }) => {
          const c = { time: k.t / 1000, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v };
          main.update(toMain(c));
          vol.update(toVol(c));
        });
      })
      .catch(() => !dead && setStatus("error"));

    return () => {
      dead = true;
      unsub();
      chart.remove();
    };
  }, [pair, interval, type, compact]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={el} className="absolute inset-0" />
      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted">
          {status === "loading" ? <span className="skeleton absolute inset-2" /> : "Chart data unavailable right now."}
        </div>
      )}
    </div>
  );
}
