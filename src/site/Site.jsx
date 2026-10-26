import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Icon, Logo, Spinner } from "../components/ui";
import { match, navigate, useRoute } from "../lib/router";
import { COIN_BY_SYMBOL, fmtPrice } from "../lib/market";
import { MarketTable } from "../market/MarketList";
import { sortTickers } from "../market/sort";
import { useSparklines, useTickers } from "../market/hooks";
import { CoinIcon, GlowLine, Pct } from "../market/parts";

const CoinView = lazy(() => import("../market/CoinView").then((m) => ({ default: m.CoinView })));
const WalletApp = lazy(() => import("../wallet/WalletApp"));

export const EXTENSION_ZIP = "downloads/aurum-wallet-extension.zip";
export const DEMO_URL = "./?demo#/wallet";

const WRAP = "mx-auto max-w-7xl px-4 sm:px-6";
const BTN = "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-300";
const BTN_NEON = `${BTN} bg-accent text-accent-ink shadow-neon hover:-translate-y-0.5 hover:bg-accent-soft`;
const BTN_GHOST = `${BTN} border border-white/10 bg-white/[.03] text-fg hover:-translate-y-0.5 hover:border-accent/50`;

const Loading = () => <div className="grid min-h-[50vh] place-items-center text-muted"><Spinner className="h-6 w-6" /></div>;

// ---------------------------------------------------------------- motion helpers

/** True once the element has scrolled into view (stays true). */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!("IntersectionObserver" in window)) return setSeen(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

/** Fades + slides children in when scrolled into view; `delay` staggers siblings. */
function Reveal({ children, delay = 0, className = "", as = "div" }) {
  const Tag = as;
  const [ref, seen] = useInView();
  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${seen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"} ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Counts from 0 to `to` once visible. */
function CountUp({ to, suffix = "", duration = 1400 }) {
  const [ref, seen] = useInView(0.4);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(to);
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);
  return <span ref={ref} className="tabular">{n.toLocaleString("en-US")}{suffix}</span>;
}

// ---------------------------------------------------------------- chrome

function Header({ path }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const links = [
    ["/markets", "Markets"],
    ["/wallet", "Web wallet"],
    ["/download", "Download"],
  ];
  const active = (p) => path === p || (p === "/markets" && path.startsWith("/coin/"));
  return (
    <header className={`sticky top-0 z-40 transition-colors duration-300 ${scrolled ? "border-b border-white/[.06] bg-ink/80 backdrop-blur-xl" : "border-b border-transparent"}`}>
      <div className={`${WRAP} flex h-16 items-center justify-between gap-4`}>
        <a href="#/" className="flex items-center gap-2.5" aria-label="Aurum home">
          <Logo size="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight">Aurum</span>
        </a>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map(([href, label]) => (
            <a key={href} href={`#${href}`} aria-current={active(href) ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-medium transition ${active(href) ? "bg-white/[.07] text-fg" : "text-muted hover:text-fg"}`}>
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="#/download" className={`${BTN_NEON} hidden h-10 px-5 text-sm sm:inline-flex`}>
            <Icon name="down" className="h-4 w-4" strokeWidth={2.4} /> Add to Chrome
          </a>
          <button className="icon-btn md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <Icon name={open ? "x" : "menu"} className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-white/[.06] bg-ink px-4 py-2 md:hidden" aria-label="Mobile">
          {links.map(([href, label]) => (
            <a key={href} href={`#${href}`} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 font-medium text-fg/90 hover:bg-white/5">{label}</a>
          ))}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-28 border-t border-white/[.06]">
      <div className={`${WRAP} flex flex-col gap-6 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-2.5"><Logo size="h-7 w-7" /><span className="font-semibold text-fg">Aurum</span><span>· Non-custodial wallet for Ethereum &amp; Solana</span></div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href="#/markets" className="hover:text-fg">Markets</a>
          <a href="#/wallet" className="hover:text-fg">Web wallet</a>
          <a href="#/download" className="hover:text-fg">Download</a>
          <span>Data: Binance · Charts: TradingView</span>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------- landing

/** Floating price chip that drifts beside the device. */
function FloatChip({ symbol, className, alt }) {
  const { tickers } = useTickers(20_000);
  const t = tickers.find((x) => x.symbol === symbol);
  return (
    <div className={`absolute z-20 hidden items-center gap-2.5 rounded-2xl border border-white/10 bg-panel/90 px-3 py-2.5 shadow-dock backdrop-blur lg:flex ${alt ? "animate-floatAlt" : "animate-float"} ${className}`}>
      <CoinIcon symbol={symbol} size="h-8 w-8" />
      <div className="text-xs">
        <p className="font-semibold">{symbol} <span className="text-muted">${fmtPrice(t?.price)}</span></p>
        <Pct value={t?.change} className="text-xs" />
      </div>
    </div>
  );
}

function Hero() {
  const lines = ["Your keys.", "Every market.", "One extension."];
  return (
    <section className="relative isolate overflow-hidden">
      {/* animated perspective grid + glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[70%]">
        <div className="neon-grid absolute inset-0 animate-gridMove" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute right-[8%] top-[18%] -z-10 h-[420px] w-[420px] animate-pulseGlow rounded-full bg-accent/25 blur-[110px]" />

      <div className={`${WRAP} grid items-center gap-16 pb-24 pt-14 lg:grid-cols-[1.1fr_auto] lg:pt-20`}>
        <div>
          <span className="inline-flex animate-rise items-center gap-2 rounded-full border border-accent/30 bg-accent/[.08] px-3.5 py-1.5 text-xs font-medium text-accent">
            <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-accent" /><span className="relative h-2 w-2 rounded-full bg-accent" /></span>
            Live on Ethereum &amp; Solana
          </span>
          <h1 className="mt-7 text-[52px] font-semibold leading-[0.98] tracking-display sm:text-[76px] lg:text-[88px]">
            {lines.map((l, i) => (
              <span key={l} className="block overflow-hidden pb-1">
                <span className={`block animate-lineUp ${i === 2 ? "text-neon" : ""}`} style={{ animationDelay: `${120 + i * 140}ms` }}>{l}</span>
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-lg animate-rise text-lg leading-relaxed text-muted [animation-delay:600ms]">
            A non-custodial wallet in your browser toolbar. Hold, send and stake across two chains, with pro charts for every coin built in.
          </p>
          <div className="mt-9 flex animate-rise flex-wrap gap-3 [animation-delay:750ms]">
            <a href="#/download" className={`${BTN_NEON} h-14 px-7 text-base`}><Icon name="down" className="h-5 w-5" strokeWidth={2.4} /> Add to Chrome — free</a>
            <a href={DEMO_URL} target="_blank" rel="noreferrer" className={`${BTN_GHOST} h-14 px-7 text-base`}>Open live demo <Icon name="external" className="h-4 w-4" /></a>
          </div>
          <dl className="mt-12 grid max-w-md animate-rise grid-cols-3 gap-6 [animation-delay:900ms]">
            <div><dt className="text-xs text-muted">Live markets</dt><dd className="mt-1 text-3xl font-semibold"><CountUp to={35} suffix="+" /></dd></div>
            <div><dt className="text-xs text-muted">Chains</dt><dd className="mt-1 text-3xl font-semibold"><CountUp to={2} /></dd></div>
            <div><dt className="text-xs text-muted">Data collected</dt><dd className="mt-1 text-3xl font-semibold">0</dd></div>
          </dl>
        </div>

        {/* The real extension, floating */}
        <div className="relative mx-auto animate-rise [animation-delay:300ms]">
          <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[48px] bg-accent/20 blur-3xl" />
          <FloatChip symbol="BTC" className="-left-36 top-20" />
          <FloatChip symbol="SOL" className="-right-28 bottom-32" alt />
          <div className="animate-float">
            <div className="w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[28px] border border-white/10 bg-panel shadow-neon">
              <div className="flex items-center gap-2 border-b border-white/[.06] px-3 py-2">
                <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-white/15" /><i className="h-2.5 w-2.5 rounded-full bg-white/15" /><i className="h-2.5 w-2.5 rounded-full bg-white/15" /></span>
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-white/[.06] px-2.5 py-1 text-[11px] text-fg/80"><Logo size="h-4 w-4" /> Aurum Wallet</span>
              </div>
              <iframe title="Aurum extension live demo" src={DEMO_URL} className="block h-[600px] w-full bg-ink" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Infinite live price ticker. */
function Ticker() {
  const { tickers } = useTickers(15_000);
  const list = useMemo(() => sortTickers(tickers, "volume").slice(0, 18), [tickers]);
  if (!list.length) return <div className="h-[66px] border-y border-white/[.06]" />;
  const row = [...list, ...list];
  return (
    <div className="group relative overflow-hidden border-y border-white/[.06] bg-panel/50" aria-label="Live prices">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink to-transparent" />
      <ul className="flex w-max animate-marquee gap-10 py-4 group-hover:[animation-play-state:paused]">
        {row.map((t, i) => (
          <li key={`${t.pair}-${i}`} aria-hidden={i >= list.length}>
            <a href={`#/coin/${t.symbol}`} className="flex items-center gap-2.5 text-sm">
              <CoinIcon symbol={t.symbol} size="h-6 w-6" />
              <span className="font-semibold">{t.symbol}</span>
              <span className="tabular text-fg/80">${fmtPrice(t.price)}</span>
              <Pct value={t.change} className="text-xs" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionHead({ kicker, title, children }) {
  return (
    <Reveal className="mb-10 max-w-2xl">
      <p className="text-sm font-semibold text-accent">{kicker}</p>
      <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tightest sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-lg text-muted">{children}</p>}
    </Reveal>
  );
}

function MarketsTeaser() {
  return (
    <section className={`${WRAP} pt-28`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHead kicker="Markets" title="Every coin, charted live.">Prices stream straight from Binance. Click any row for candles, order book and trades.</SectionHead>
        <Reveal className="mb-10"><a href="#/markets" className={`${BTN_GHOST} h-11 px-5 text-sm`}>All markets <Icon name="send" className="h-4 w-4" /></a></Reveal>
      </div>
      <Reveal delay={100}><MarketTable limit={8} onOpen={(s) => navigate(`/coin/${s}`)} /></Reveal>
    </section>
  );
}

/** Bento grid of features with hover lift and a live mini chart. */
function Features() {
  const sparks = useSparklines(["ETHUSDT"]);
  const small = [
    ["shield", "Non-custodial", "Your phrase is encrypted with AES-256 on your device. We never see your keys."],
    ["key", "One phrase, two chains", "Unlimited Ethereum and Solana accounts from a single recovery phrase."],
    ["swap", "Send anything", "ETH, SOL, ERC-20 and SPL tokens with live fee estimates."],
    ["stake", "Earn", "Stake SOL with top validators, then unstake and claim."],
    ["lock", "Auto-lock", "Locks itself when you step away and forgets the session when the browser closes."],
  ];
  const card = "group relative overflow-hidden rounded-3xl border border-white/[.07] bg-panel p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-neon";
  return (
    <section className={`${WRAP} pt-28`}>
      <SectionHead kicker="Why Aurum" title="Built like a trading desk, safe like a vault." />
      <div className="grid gap-4 md:grid-cols-3">
        <Reveal className={`${card} md:col-span-2 md:row-span-2`}>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent"><Icon name="bars" className="h-5 w-5" /></span>
          <h3 className="mt-5 text-2xl font-semibold">Pro charts in your toolbar</h3>
          <p className="mt-2 max-w-md text-muted">Candlesticks, depth and live trades for every listed coin — the same data traders use, one click from your wallet.</p>
          <div className="mt-8 rounded-2xl border border-white/[.06] bg-ink/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-semibold"><CoinIcon symbol="ETH" size="h-6 w-6" /> ETH / USDT</span>
              <span className="text-xs text-muted">7 days</span>
            </div>
            <GlowLine points={sparks.ETHUSDT} className="mt-3 h-40 w-full" />
          </div>
        </Reveal>
        {small.map(([icon, title, text], i) => (
          <Reveal key={title} delay={80 * (i + 1)} className={card}>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-accent-ink"><Icon name={icon} className="h-5 w-5" /></span>
            <h3 className="mt-5 text-lg font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function SecurityBand() {
  const stats = [
    [<CountUp key="a" to={600000} />, "PBKDF2 rounds protect your password"],
    ["AES-256", "GCM encryption for your recovery phrase"],
    [<CountUp key="b" to={0} />, "servers that ever see your keys"],
  ];
  return (
    <section className={`${WRAP} pt-28`}>
      <Reveal className="relative overflow-hidden rounded-[32px] border border-accent/20 bg-gradient-to-br from-accent/[.10] via-panel to-panel p-8 sm:p-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 animate-pulseGlow rounded-full bg-accent/20 blur-3xl" />
        <p className="relative text-sm font-semibold text-accent">Security</p>
        <h2 className="relative mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tightest sm:text-5xl">Your keys are encrypted before they ever touch storage.</h2>
        <div className="relative mt-10 grid gap-8 sm:grid-cols-3">
          {stats.map(([value, label], i) => (
            <Reveal key={label} delay={120 * i}>
              <p className="text-4xl font-semibold text-neon">{value}</p>
              <p className="mt-2 text-sm text-muted">{label}</p>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function Download() {
  const steps = [
    ["Download", "Get the package below and unzip it."],
    ["Open extensions", "Go to chrome://extensions (or edge:// · brave://)."],
    ["Developer mode", "Switch it on in the top-right corner."],
    ["Load unpacked", "Pick the unzipped folder, then pin Aurum."],
  ];
  return (
    <section id="download" className={`${WRAP} scroll-mt-24 pt-28`}>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <Reveal>
          <p className="text-sm font-semibold text-accent">Get started</p>
          <h2 className="mt-3 text-5xl font-semibold leading-[1.02] tracking-display sm:text-6xl">Install Aurum<br />in a minute.</h2>
          <p className="mt-4 max-w-md text-lg text-muted">Free and open source. Chrome, Edge, Brave, Arc and every Chromium browser.</p>
          <a href={EXTENSION_ZIP} download className={`${BTN_NEON} mt-8 h-14 px-8 text-base`}><Icon name="down" className="h-5 w-5" strokeWidth={2.4} /> Download for Chrome</a>
          <p className="mt-3 text-xs text-muted">Version 1.0.0 · Manifest V3 · 650 KB</p>
        </Reveal>
        <ol className="space-y-3">
          {steps.map(([title, text], i) => (
            <Reveal key={title} as="li" delay={100 * i} className="flex items-center gap-4 rounded-2xl border border-white/[.07] bg-panel p-5 transition hover:border-accent/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent font-semibold text-accent-ink">{i + 1}</span>
              <div><p className="font-semibold">{title}</p><p className="text-sm text-muted">{text}</p></div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- other pages

function MarketsPage() {
  const [q, setQ] = useState("");
  return (
    <div className={`${WRAP} py-10`}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tightest sm:text-5xl">Markets</h1>
          <p className="mt-2 text-muted">Live USDT spot prices. Pick a coin for candles, order book and trades.</p>
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search coins</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input rounded-full pl-11" placeholder="Search coin" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <MarketTable search={q} onOpen={(s) => navigate(`/coin/${s}`)} />
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
    <div className={`${WRAP} py-6`}>
      <a href="#/markets" className="mb-4 inline-flex min-h-[36px] items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <Icon name="back" className="h-4 w-4" /> All markets
      </a>
      {!COIN_BY_SYMBOL[sym] && <p className="mb-4 text-sm text-muted">{sym} isn't in our curated list — showing raw Binance data.</p>}
      <Suspense fallback={<Loading />}>
        <CoinView key={sym} symbol={sym} variant="full" />
      </Suspense>
    </div>
  );
}

export default function Site() {
  const path = useRoute();

  if (path === "/wallet") {
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
  else if (path === "/download") page = <Download />;
  else page = <><Hero /><Ticker /><MarketsTeaser /><Features /><SecurityBand /><Download /></>;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header path={path} />
      <main className="flex-1">{page}</main>
      <Footer />
    </div>
  );
}
