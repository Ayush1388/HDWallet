import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Icon, Logo, Spinner } from "../components/ui";
import { match, navigate, useRoute } from "../lib/router";
import { COIN_BY_SYMBOL, fmtPrice } from "../lib/market";
import { MarketTable } from "../market/MarketList";
import { sortTickers } from "../market/sort";
import { useTickers } from "../market/hooks";
import { CoinIcon, Pct } from "../market/parts";

const CoinView = lazy(() => import("../market/CoinView").then((m) => ({ default: m.CoinView })));
const WalletApp = lazy(() => import("../wallet/WalletApp"));

export const EXTENSION_ZIP = "downloads/aurum-wallet-extension.zip";
export const DEMO_URL = "./?demo#/wallet";

// Monochrome, Apple-style site. Light (#F5F5F7) and black chapters alternate; colour appears
// only as green/red on market data. Structure: dark inset hero -> live extension -> markets ->
// black security chapter -> get started -> footer.
const GUTTER = "px-4 sm:px-8 lg:px-12";
const PILL = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition duration-300";
const PILL_DARK = `${PILL} bg-site-icedeep text-white hover:bg-[#0A74BC] hover:-translate-y-0.5`;
const PILL_LIGHT = `${PILL} bg-site-ice text-[#06121C] shadow-[0_8px_30px_-8px_rgba(124,200,255,.6)] hover:bg-[#B8E4FF] hover:-translate-y-0.5`;
const PILL_ICE = `${PILL} bg-site-icedeep text-white hover:bg-[#0A74BC] hover:-translate-y-0.5`;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Loading = () => <div className="grid min-h-[50vh] place-items-center text-site-muted"><Spinner className="h-6 w-6" /></div>;

// ------------------------------------------------------------------ motion helpers

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!("IntersectionObserver" in window) || reduced()) return setSeen(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

/** Fades and lifts its children in when scrolled into view; `delay` staggers siblings. */
function Reveal({ children, delay = 0, className = "", as = "div" }) {
  const Tag = as;
  const [ref, seen] = useInView();
  return (
    <Tag ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)] ${seen ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"} ${className}`}>
      {children}
    </Tag>
  );
}

/** Counts up to `to` once visible. */
function CountUp({ to, suffix = "" }) {
  const [ref, seen] = useInView(0.4);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced()) return setN(to);
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 1600);
      setN(Math.round(to * (1 - (1 - p) ** 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return <span ref={ref} className="tabular">{n.toLocaleString("en-US")}{suffix}</span>;
}

/** 0 → 1 as the element travels from the bottom of the viewport to ~10% from the top. */
function useScrollProgress() {
  const ref = useRef(null);
  const [p, setP] = useState(reduced() ? 1 : 0);
  useEffect(() => {
    if (reduced()) return;
    let raf;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        setP(Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.85))));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return [ref, p];
}

// ------------------------------------------------------------------ chrome

function Header({ path }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["/markets", "Markets"],
    ["/wallet", "Web wallet"],
    ["/download", "Download"],
  ];
  const active = (p) => path === p || (p === "/markets" && path.startsWith("/coin/"));
  return (
    <header className="sticky top-0 z-40 border-b border-black/[.06] bg-site-bg/80 backdrop-blur-xl">
      <div className={`${GUTTER} flex h-14 items-center justify-between gap-4`}>
        <a href="#/" className="flex items-center gap-2 text-site-ink" aria-label="Aurum home">
          <Logo size="h-7 w-7" tone="dark" />
          <span className="text-[17px] font-semibold tracking-tight">Aurum</span>
        </a>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map(([href, label]) => (
            <a key={href} href={`#${href}`} aria-current={active(href) ? "page" : undefined} className={`text-[13px] transition ${active(href) ? "text-site-ink" : "text-site-ink/70 hover:text-site-ink"}`}>
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="#/download" className={`${PILL_DARK} hidden h-9 px-4 text-[13px] sm:inline-flex`}>Download</a>
          <button className="grid h-10 w-10 place-items-center rounded-full text-site-ink hover:bg-black/5 md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <Icon name={open ? "x" : "menu"} className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-black/[.06] px-4 py-2 md:hidden" aria-label="Mobile">
          {links.map(([href, label]) => (
            <a key={href} href={`#${href}`} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-site-ink hover:bg-black/5">{label}</a>
          ))}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const cols = [
    ["Product", [["Download", "#/download"], ["Web wallet", "#/wallet"], ["Live demo", DEMO_URL]]],
    ["Markets", [["All markets", "#/markets"], ["Bitcoin", "#/coin/BTC"], ["Ethereum", "#/coin/ETH"], ["Solana", "#/coin/SOL"]]],
    ["Data", [["Binance market data", "https://www.binance.com"], ["TradingView charts", "https://www.tradingview.com/lightweight-charts/"]]],
  ];
  return (
    <footer className="bg-site-bg text-[12px] text-site-muted">
      <div className={`${GUTTER} mx-auto max-w-6xl py-10`}>
        <p className="border-b border-site-line pb-4">Aurum is a non-custodial wallet. You hold your keys; nobody can recover them for you. Market data is for information only and is not financial advice.</p>
        <div className="grid gap-8 py-8 sm:grid-cols-3">
          {cols.map(([title, links]) => (
            <div key={title}>
              <p className="font-semibold text-site-ink">{title}</p>
              <ul className="mt-2 space-y-2">
                {links.map(([label, href]) => (
                  <li key={label}><a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})} className="hover:text-site-ink hover:underline">{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-site-line pt-4">
          <span>Copyright © 2026 Aurum. All rights reserved.</span>
          <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-up" /> Markets live</span>
        </div>
      </div>
    </footer>
  );
}

// ------------------------------------------------------------------ landing

const ORBIT = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "LINK", "AVAX", "DOT"];

/** Coin logos slowly orbiting behind the headline. */
function Orbit() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -z-10 hidden h-[860px] w-[860px] -translate-x-1/2 -translate-y-1/2 md:block">
      <div className="absolute inset-0 rounded-full border border-white/[.06]" />
      <div className="absolute inset-[18%] rounded-full border border-white/[.05]" />
      <div className="absolute inset-0 animate-orbit">
        {ORBIT.map((sym, i) => {
          const a = (i / ORBIT.length) * 360;
          return (
            <div key={sym} className="absolute left-1/2 top-1/2" style={{ transform: `rotate(${a}deg) translateX(430px) rotate(${-a}deg)` }}>
              <div className="-translate-x-1/2 -translate-y-1/2 animate-counter opacity-75">
                <CoinIcon symbol={sym} size="h-10 w-10" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Black inset hero with a cursor-following spotlight, dot field and orbiting coins. */
function Hero() {
  const card = useRef(null);
  const onMove = (e) => {
    const el = card.current;
    if (!el || reduced()) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  const lines = ["Your keys.", "Every market.", "One extension."];
  return (
    <section className={`${GUTTER} pt-4`}>
      <div
        ref={card}
        onMouseMove={onMove}
        className="relative isolate flex min-h-[min(780px,86vh)] flex-col items-center justify-center overflow-hidden rounded-[36px] bg-site-dark px-6 py-28 text-center text-white [--x:50%] [--y:30%]"
      >
        {/* dot field + spotlight */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(520px_circle_at_var(--x)_var(--y),rgba(255,255,255,.10),transparent_60%)] transition-[background] duration-200" />
        <Orbit />

        <p className="animate-rise text-[15px] font-medium text-white/60 sm:text-[17px]">Aurum · the wallet that lives in your browser</p>
        <h1 className="mt-5 text-[52px] font-semibold leading-[1.02] tracking-display sm:text-[84px] lg:text-[104px]">
          {lines.map((l, i) => (
            <span key={l} className="block overflow-hidden pb-[0.06em]">
              <span className={`block animate-lineUp ${i === 2 ? "text-sheen-dark" : ""}`} style={{ animationDelay: `${150 + i * 160}ms` }}>{l}</span>
            </span>
          ))}
        </h1>
        <p className="mt-7 max-w-xl animate-rise text-lg text-white/60 [animation-delay:700ms] sm:text-xl">Hold, send and stake on Ethereum and Solana. Pro charts for every coin. Keys that never leave your device.</p>
        <div className="mt-10 flex animate-rise flex-col items-center gap-4 [animation-delay:850ms] sm:flex-row">
          <a href="#/download" className={`${PILL_LIGHT} h-14 px-8 text-[17px]`}><Icon name="down" className="h-5 w-5" /> Add to Chrome</a>
          <a href="#preview" onClick={(e) => { e.preventDefault(); document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" }); }} className="group inline-flex h-14 items-center gap-1.5 px-4 text-[17px] text-white/80 transition hover:text-white">
            See it in action <Icon name="chevronRight" className="h-4 w-4 transition group-hover:translate-x-1" />
          </a>
        </div>
        <span aria-hidden="true" className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-nudge text-white/40"><Icon name="chevron" className="h-6 w-6" /></span>
      </div>
    </section>
  );
}

/** Live prices scrolling endlessly. */
function Ticker() {
  const { tickers } = useTickers(15_000);
  const list = useMemo(() => sortTickers(tickers, "volume").slice(0, 18), [tickers]);
  if (!list.length) return <div className="h-[64px]" />;
  const row = [...list, ...list];
  return (
    <div className="group relative mt-6 overflow-hidden" aria-label="Live prices">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28 bg-gradient-to-r from-site-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28 bg-gradient-to-l from-site-bg to-transparent" />
      <ul className="flex w-max animate-marquee gap-3 py-2 group-hover:[animation-play-state:paused]">
        {row.map((t, i) => (
          <li key={`${t.pair}-${i}`} aria-hidden={i >= list.length}>
            <a href={`#/coin/${t.symbol}`} className="flex items-center gap-2.5 rounded-full bg-white px-4 py-2.5 text-sm text-site-ink shadow-[0_1px_2px_rgba(0,0,0,.05)] transition hover:-translate-y-0.5">
              <CoinIcon symbol={t.symbol} size="h-6 w-6" />
              <span className="font-semibold">{t.symbol}</span>
              <span className="tabular text-site-muted">${fmtPrice(t.price)}</span>
              <Pct value={t.change} className="text-xs" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The real extension, tilting upright as it scrolls into view. */
function ExtensionPreview() {
  const [ref, p] = useScrollProgress();
  const tilt = (1 - p) * 28;
  const scale = 0.86 + p * 0.14;
  const points = [
    ["home", "Home", "Balance, 24h change, every token"],
    ["bars", "Markets", "Live candles and order books"],
    ["swap", "Transfer", "Any token, live network fees"],
    ["stake", "Earn", "Stake SOL, claim rewards"],
  ];
  return (
    <section id="preview" className={`${GUTTER} scroll-mt-20 pt-32`}>
      <Reveal className="mx-auto max-w-3xl text-center text-site-ink">
        <p className="text-[17px] font-semibold text-site-icedeep">Live demo</p>
        <h2 className="mt-2 text-[44px] font-semibold leading-[1.05] tracking-display sm:text-[64px]">This is the extension.<br /><span className="text-sheen-light">Go ahead, tap around.</span></h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-site-muted">The window below is the real popup, running on sample balances. Markets and charts are live.</p>
      </Reveal>
      <div ref={ref} className="mt-14 overflow-hidden rounded-[36px] bg-site-dark px-4 pt-14 [perspective:1400px] sm:px-10">
        <div
          className="mx-auto w-[392px] max-w-full origin-bottom overflow-hidden rounded-t-[28px] border border-b-0 border-white/10 bg-[#1C1C1E] shadow-[0_-30px_80px_-30px_rgba(255,255,255,.18)] will-change-transform"
          style={{ transform: `rotateX(${tilt}deg) scale(${scale})` }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-white/20" /><i className="h-2.5 w-2.5 rounded-full bg-white/20" /><i className="h-2.5 w-2.5 rounded-full bg-white/20" /></span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-white/[.08] px-2.5 py-1 text-[11px] text-white/80"><Logo size="h-4 w-4" /> Aurum Wallet</span>
          </div>
          <iframe title="Aurum extension live demo" src={DEMO_URL} loading="lazy" className="block h-[600px] w-full bg-black" />
        </div>
      </div>
      <ul className="mx-auto mt-5 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {points.map(([icon, title, text], i) => (
          <Reveal key={title} as="li" delay={i * 90} className="rounded-[28px] bg-white p-6 text-site-ink transition duration-300 hover:-translate-y-1 hover:shadow-lift">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-site-ice/20 text-site-icedeep"><Icon name={icon} className="h-5 w-5" /></span>
            <p className="mt-5 text-[19px] font-semibold tracking-tight">{title}</p>
            <p className="mt-1 text-[15px] text-site-muted">{text}</p>
          </Reveal>
        ))}
      </ul>
      <Reveal className="mt-8 text-center">
        <a href={DEMO_URL} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-1.5 text-[17px] text-site-icedeep hover:underline">
          Open the demo full screen <Icon name="chevronRight" className="h-4 w-4 transition group-hover:translate-x-1" />
        </a>
      </Reveal>
    </section>
  );
}

function MarketsTeaser() {
  return (
    <section className={`${GUTTER} pt-32`}>
      <Reveal className="mb-10 flex flex-col items-start justify-between gap-6 text-site-ink sm:flex-row sm:items-end">
        <div>
          <p className="text-[17px] font-semibold text-site-icedeep">Markets</p>
          <h2 className="mt-2 text-[44px] font-semibold leading-[1.05] tracking-display sm:text-[64px]">Every market.<br /><span className="text-sheen-light">Live.</span></h2>
        </div>
        <a href="#/markets" className={`${PILL_DARK} h-12 px-6 text-[15px]`}>All markets <Icon name="chevronRight" className="h-4 w-4" /></a>
      </Reveal>
      <Reveal delay={120}>
        <MarketTable limit={8} onOpen={(s) => navigate(`/coin/${s}`)} />
      </Reveal>
    </section>
  );
}

const FEATURES = [
  ["shield", "Non-custodial", "Your recovery phrase is encrypted on your device. Nobody else ever sees your keys."],
  ["bars", "Pro charts", "Candlesticks, order books and live trades for every listed coin."],
  ["key", "One phrase, two chains", "Unlimited Ethereum and Solana accounts from a single recovery phrase."],
  ["swap", "Send anything", "ETH, SOL, ERC-20 and SPL tokens, with the network fee shown up front."],
  ["stake", "Earn", "Delegate SOL to top validators, then unstake and claim in one place."],
  ["lock", "Auto-lock", "Locks itself when you step away and forgets the session when the browser closes."],
];

/** Full-bleed black chapter: spec-sheet numbers counting up, then the feature list. */
function Security() {
  const specs = [
    [<CountUp key="a" to={600000} />, "PBKDF2 rounds stretch your password"],
    ["256-bit", "AES-GCM encryption for your phrase"],
    [<CountUp key="b" to={0} />, "servers that ever hold your keys"],
  ];
  return (
    <section className="mt-32 bg-site-dark py-32 text-white">
      <div className={`${GUTTER} mx-auto max-w-6xl`}>
        <Reveal className="text-center">
          <p className="text-[17px] font-semibold text-site-ice">Security</p>
          <h2 className="mx-auto mt-3 max-w-4xl text-[44px] font-semibold leading-[1.05] tracking-display sm:text-[72px]">
            Controlled by you.<br /><span className="text-sheen-dark">Secured by math.</span>
          </h2>
        </Reveal>
        <div className="mt-20 grid gap-px overflow-hidden rounded-[28px] bg-white/10 sm:grid-cols-3">
          {specs.map(([value, label], i) => (
            <Reveal key={label} delay={i * 120} className="bg-site-dark2 p-8 text-center">
              <p className="text-[44px] font-semibold tracking-tight sm:text-[56px]">{value}</p>
              <p className="mt-1 text-white/55">{label}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-20 grid gap-x-12 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([icon, title, text], i) => (
            <Reveal key={title} delay={(i % 3) * 100}>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-site-ice/15 text-site-ice"><Icon name={icon} className="h-5 w-5" /></span>
              <h3 className="mt-5 text-[21px] font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 leading-relaxed text-white/55">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function GetStarted() {
  const steps = [
    ["Download", "Get the package and unzip it."],
    ["Open extensions", "Go to chrome://extensions (or edge:// · brave://)."],
    ["Developer mode", "Switch it on in the top-right corner."],
    ["Load unpacked", "Pick the unzipped folder, then pin Aurum."],
  ];
  return (
    <section id="download" className="scroll-mt-20 bg-white py-32 text-site-ink">
      <div className={`${GUTTER} mx-auto max-w-6xl text-center`}>
        <Reveal>
          <p className="text-[17px] font-semibold text-site-icedeep">Free · Open source · Chrome, Edge, Brave, Arc</p>
          <h2 className="mt-4 text-[56px] font-semibold leading-[1] tracking-display sm:text-[96px]">Get started.<br /><span className="text-sheen-light">Download Aurum.</span></h2>
          <a href={EXTENSION_ZIP} download className={`${PILL_DARK} mt-12 h-16 px-10 text-[17px]`}><Icon name="down" className="h-5 w-5" /> Download for Chrome</a>
          <p className="mt-4 text-sm text-site-muted">Version 1.0.0 · Manifest V3 · 650 KB</p>
        </Reveal>
        <ol className="mt-20 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, text], i) => (
            <Reveal key={title} as="li" delay={i * 90} className="rounded-[28px] bg-site-bg p-7 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
              <span className="text-[44px] font-semibold leading-none tracking-tight text-site-ice">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-6 text-[19px] font-semibold tracking-tight">{title}</p>
              <p className="mt-1 text-[15px] text-site-muted">{text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ other pages

function MarketsPage() {
  const [q, setQ] = useState("");
  return (
    <div className={`${GUTTER} pb-24 pt-12`}>
      <div className="mb-10 flex flex-col gap-6 text-site-ink sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[52px] font-semibold leading-none tracking-display sm:text-[72px]">Markets</h1>
          <p className="mt-3 text-lg text-site-muted">Live USDT spot prices. Pick a coin for candles, order book and trades.</p>
        </div>
        <label className="relative w-full sm:w-80">
          <span className="sr-only">Search coins</span>
          <Icon name="search" className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-site-muted" />
          <input className="h-12 w-full rounded-full border border-site-line bg-white pl-12 pr-5 text-site-ink placeholder:text-site-muted focus:border-site-icedeep focus:outline-none focus:ring-4 focus:ring-site-ice/30" placeholder="Search coin" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div><MarketTable search={q} onOpen={(s) => navigate(`/coin/${s}`)} /></div>
    </div>
  );
}

function CoinPage({ symbol }) {
  const sym = symbol.toUpperCase();
  useEffect(() => {
    document.title = `${sym}/USDT · Aurum`;
    return () => {
      document.title = "Aurum Wallet";
    };
  }, [sym]);
  return (
    <div className={`${GUTTER} pb-24 pt-6`}>
      <a href="#/markets" className={`${PILL} mb-5 h-10 bg-white px-4 text-sm text-site-ink hover:bg-[#E8E8ED]`}>
        <Icon name="back" className="h-4 w-4" /> All markets
      </a>
      {!COIN_BY_SYMBOL[sym] && <p className="mb-4 text-sm text-site-muted">{sym} isn't in our curated list — showing raw Binance data.</p>}
      <Suspense fallback={<Loading />}>
        <CoinView key={sym} symbol={sym} variant="full" />
      </Suspense>
    </div>
  );
}

export default function Site() {
  const path = useRoute();
  const isWallet = path === "/wallet";

  // The site is light; the wallet keeps the extension's black surface.
  useEffect(() => {
    const b = document.body.style;
    b.backgroundColor = isWallet ? "" : "#F5F5F7";
    b.color = isWallet ? "" : "#1D1D1F";
  }, [isWallet]);

  if (isWallet) {
    return (
      <Suspense fallback={<Loading />}>
        <>
          <WalletApp />
          <a href="#/" className="fixed left-6 top-6 z-40 hidden items-center gap-1.5 rounded-full border border-white/[.08] bg-panel px-4 py-2 text-sm text-muted transition hover:text-fg lg:inline-flex">
            <Icon name="back" className="h-4 w-4" /> Back to site
          </a>
        </>
      </Suspense>
    );
  }

  const coin = match("/coin/:symbol", path);
  let page;
  if (coin) page = <CoinPage symbol={coin.symbol} />;
  else if (path === "/markets") page = <MarketsPage />;
  else if (path === "/download") page = <><GetStarted /><ExtensionPreview /><div className="pb-24" /></>;
  else page = <><Hero /><Ticker /><ExtensionPreview /><MarketsTeaser /><Security /><GetStarted /></>;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-site-bg text-site-ink">
      <Header path={path} />
      <main className="flex-1">{page}</main>
      <Footer />
    </div>
  );
}
