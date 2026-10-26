import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Icon, Logo, Spinner } from "../components/ui";
import { match, navigate, useRoute } from "../lib/router";
import { COIN_BY_SYMBOL, fmtPrice } from "../lib/market";
import { MarketTable } from "../market/MarketList";
import { sortTickers } from "../market/sort";
import { useSparklines, useTickers } from "../market/hooks";
import { CoinIcon, Pct, Spark } from "../market/parts";

const CoinView = lazy(() => import("../market/CoinView").then((m) => ({ default: m.CoinView })));
const WalletApp = lazy(() => import("../wallet/WalletApp"));

export const EXTENSION_ZIP = "downloads/aurum-wallet-extension.zip";

const Loading = () => <div className="grid min-h-[50vh] place-items-center text-muted"><Spinner className="h-6 w-6" /></div>;

function Header({ path }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["/markets", "Markets"],
    ["/wallet", "Web wallet"],
    ["/download", "Download"],
  ];
  const active = (p) => path === p || (p === "/markets" && path.startsWith("/coin/"));
  return (
    <header className="sticky top-0 z-40 border-b border-white/[.06] bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#/" className="flex items-center gap-2.5" aria-label="Aurum home">
          <Logo size="h-8 w-8" />
          <span className="text-lg font-extrabold tracking-tight">Aurum</span>
        </a>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map(([href, label]) => (
            <a key={href} href={`#${href}`} aria-current={active(href) ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active(href) ? "bg-white/[.06] text-white" : "text-muted hover:text-white"}`}>
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="#/download" className="hidden min-h-[40px] items-center gap-2 rounded-full bg-accent px-4 text-sm font-bold text-accent-ink transition hover:brightness-110 sm:inline-flex">
            <Icon name="down" className="h-4 w-4" strokeWidth={2.4} /> Add to Chrome
          </a>
          <button className="icon-btn md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <Icon name={open ? "x" : "bars"} className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-white/[.06] px-4 py-2 md:hidden" aria-label="Mobile">
          {links.map(([href, label]) => (
            <a key={href} href={`#${href}`} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 font-semibold text-zinc-200 hover:bg-white/5">{label}</a>
          ))}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[.06]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5"><Logo size="h-7 w-7" /> <span className="font-bold text-zinc-200">Aurum</span> · Non-custodial wallet for Ethereum & Solana</div>
        <p>Market data: Binance · Charts: TradingView Lightweight Charts™ · Not financial advice.</p>
      </div>
    </footer>
  );
}

/** Live phone mock-up for the hero (mirrors the extension's home screen). */
function PhonePreview() {
  const { tickers } = useTickers(15_000);
  const btc = tickers.find((t) => t.symbol === "BTC");
  const trending = useMemo(() => sortTickers(tickers, "trending").slice(0, 3), [tickers]);
  const sparks = useSparklines(["BTCUSDT"]);
  return (
    <div className="relative mx-auto w-[300px] rounded-[44px] border border-white/10 bg-ink p-3 shadow-[0_40px_120px_-30px_rgba(245,158,11,.3)]">
      <div className="mx-auto mb-3 h-6 w-28 rounded-full bg-slate-800" />
      <div className="rounded-[26px] bg-gradient-to-br from-accent-soft via-accent to-[#E07B06] p-4 text-accent-ink">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-extrabold"><CoinIcon symbol="BTC" size="h-8 w-8" /> BTC</span>
          <span className="rounded-full bg-accent-ink/10 px-2.5 py-1 text-[10px] font-bold">Top crypto</span>
        </div>
        <p className="mt-4 text-[11px] font-semibold text-accent-ink/70">Bitcoin · 24h</p>
        <div className="flex items-end justify-between gap-2">
          <p className="text-3xl font-extrabold tabular">{btc ? `${btc.change >= 0 ? "+" : ""}${btc.change.toFixed(2)}%` : "—"}</p>
          <Spark points={sparks.BTCUSDT} stroke="#0F172A" className="h-10 w-24" />
        </div>
        <p className="mt-1 text-xs font-bold tabular">${fmtPrice(btc?.price)}</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[["up", "Send"], ["down", "Receive"], ["stake", "Earn"]].map(([i, l]) => (
          <div key={l} className="flex flex-col items-center gap-1.5 rounded-2xl bg-panel py-3 text-[11px] font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10"><Icon name={i} className="h-4 w-4" /></span>{l}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-panel p-2.5">
        <div className="mb-2 flex gap-1.5 text-[10px] font-semibold">
          <span className="rounded-full border border-accent/60 px-2 py-1 text-accent">Trending</span>
          <span className="rounded-full border border-white/10 px-2 py-1 text-muted">Gainers</span>
          <span className="rounded-full border border-white/10 px-2 py-1 text-muted">Volume</span>
        </div>
        {(trending.length ? trending : [null, null, null]).map((t, i) => (
          <div key={t?.pair ?? i} className="mb-1.5 flex items-center gap-2 rounded-xl bg-white/[.03] px-2 py-2 last:mb-0">
            {t ? <CoinIcon symbol={t.symbol} size="h-7 w-7" /> : <span className="skeleton h-7 w-7 rounded-full" />}
            <span className="flex-1 text-xs font-bold">{t?.symbol ?? "—"}<br /><Pct value={t?.change} className="text-[10px]" /></span>
            <span className="text-right text-xs font-bold tabular">{fmtPrice(t?.price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  ["shield", "Non-custodial", "Your recovery phrase is encrypted with AES-256 on your device. We never see your keys."],
  ["bars", "Live markets", "Binance-grade candlestick charts, order books and trades for every listed coin."],
  ["key", "One phrase, two chains", "Unlimited Ethereum and Solana accounts from a single recovery phrase."],
  ["swap", "Send any token", "ETH, SOL, ERC-20 and SPL tokens with live fee estimates and speed control."],
  ["stake", "Earn with staking", "Delegate SOL to top validators, then unstake and claim from one screen."],
  ["lock", "Auto-lock", "The extension locks itself after inactivity and forgets the session when the browser closes."],
];

function Landing() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs font-semibold text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Ethereum · Solana · Browser extension
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              The crypto wallet<br />that lives in your <span className="text-accent">browser.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">Hold, send and stake across Ethereum and Solana, and track every market with live pro-grade charts. Your keys never leave your device.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#/download" className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-accent px-6 font-bold text-accent-ink shadow-glow transition hover:brightness-110">
                <Icon name="down" className="h-5 w-5" strokeWidth={2.4} /> Download extension
              </a>
              <a href="#preview" onClick={(e) => { e.preventDefault(); document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] px-6 font-bold transition hover:border-accent/40">
                Try the live demo <Icon name="send" className="h-4 w-4" />
              </a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[["35+", "Live markets"], ["2", "Chains"], ["0", "Data collected"]].map(([v, l]) => (
                <div key={l}><dt className="text-xs text-muted">{l}</dt><dd className="text-2xl font-extrabold">{v}</dd></div>
              ))}
            </dl>
          </div>
          <PhonePreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Markets today</h2>
            <p className="mt-1 text-muted">Live prices from Binance. Click any coin for the full chart.</p>
          </div>
          <a href="#/markets" className="hidden items-center gap-1.5 text-sm font-bold text-accent hover:underline sm:inline-flex">View all markets <Icon name="send" className="h-4 w-4" /></a>
        </div>
        <MarketTable limit={10} onOpen={(s) => navigate(`/coin/${s}`)} />
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Everything a pro wallet needs</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([icon, title, text]) => (
            <div key={title} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent"><Icon name={icon} className="h-5 w-5" /></span>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <ExtensionPreview />
      <DownloadSection />
    </>
  );
}

export const DEMO_URL = "./?demo#/wallet";

/** The real extension UI running live in demo mode (no password, sample data), at popup size. */
function ExtensionPreview() {
  const points = [
    ["home", "Home", "Balance, 24h change, portfolio chart and your tokens."],
    ["bars", "Markets", "Tap any coin for live candles and the order book."],
    ["swap", "Transfer", "Send any token with a live network-fee estimate."],
    ["stake", "Earn", "Stake SOL with top validators and claim rewards."],
  ];
  return (
    <section id="preview" className="mx-auto mt-24 max-w-7xl scroll-mt-24 px-4 sm:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> Live demo · no install, no password
          </span>
          <h2 className="mt-5 text-4xl font-extrabold tracking-tight">This is the extension.<br />Go ahead, tap around.</h2>
          <p className="mt-3 max-w-lg text-muted">
            The window on the right is the actual Aurum popup running in demo mode with sample balances. Markets and charts are live; sending and staking are disabled.
          </p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {points.map(([icon, title, text]) => (
              <li key={title} className="flex gap-3 rounded-2xl border border-white/[.06] bg-panel p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name={icon} className="h-4 w-4" /></span>
                <div><p className="text-sm font-bold">{title}</p><p className="text-xs leading-relaxed text-muted">{text}</p></div>
              </li>
            ))}
          </ul>
          <a href={DEMO_URL} target="_blank" rel="noreferrer" className="mt-7 inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] px-5 font-bold transition hover:border-accent/40">
            Open demo full screen <Icon name="external" className="h-4 w-4" />
          </a>
        </div>
        <div className="mx-auto">
          {/* Browser-toolbar chrome so it reads as an extension popup. */}
          <div className="w-[392px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#151D2E] shadow-[0_40px_120px_-30px_rgba(245,158,11,.3)]">
            <div className="flex items-center gap-2 border-b border-white/[.06] px-3 py-2">
              <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-white/15" /><i className="h-2.5 w-2.5 rounded-full bg-white/15" /><i className="h-2.5 w-2.5 rounded-full bg-white/15" /></span>
              <span className="ml-auto flex items-center gap-1.5 rounded-md bg-white/[.06] px-2 py-1 text-[11px] font-semibold text-zinc-300"><Logo size="h-4 w-4" /> Aurum Wallet</span>
            </div>
            <iframe title="Aurum extension live demo" src={DEMO_URL} loading="lazy" className="block h-[600px] w-full bg-ink" />
          </div>
        </div>
      </div>
    </section>
  );
}

function DownloadSection() {
  const steps = [
    ["Download", "Get the extension package below and unzip it."],
    ["Open extensions", <>Go to <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">chrome://extensions</code> (or <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">edge://extensions</code>, <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">brave://extensions</code>).</>],
    ["Developer mode", "Switch on “Developer mode” in the top-right corner."],
    ["Load unpacked", "Click “Load unpacked”, pick the unzipped folder, then pin Aurum to your toolbar."],
  ];
  return (
    <section id="download" className="mx-auto mt-24 max-w-7xl scroll-mt-24 px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-[32px] border border-accent/20 bg-gradient-to-br from-accent/[.12] via-panel to-panel p-8 sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight">Install Aurum</h2>
            <p className="mt-3 max-w-md text-muted">Works in Chrome, Edge, Brave, Arc and other Chromium browsers. Free and open source.</p>
            <a href={EXTENSION_ZIP} download className="mt-7 inline-flex min-h-[56px] items-center gap-2.5 rounded-2xl bg-accent px-7 text-lg font-bold text-accent-ink shadow-glow transition hover:brightness-110">
              <Icon name="down" className="h-5 w-5" strokeWidth={2.4} /> Download for Chrome
            </a>
            <p className="mt-3 text-xs text-muted">Version 1.0.0 · Manifest V3 · 650 KB</p>
          </div>
          <ol className="space-y-3">
            {steps.map(([title, text], i) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-white/[.06] bg-ink/50 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent font-extrabold text-accent-ink">{i + 1}</span>
                <div><p className="font-bold">{title}</p><p className="mt-0.5 text-sm text-muted">{text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function MarketsPage() {
  const [q, setQ] = useState("");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Markets</h1>
          <p className="mt-1 text-muted">Live USDT spot prices. Select a coin for candlestick charts, order book and trades.</p>
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search coins</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-11" placeholder="Search coin" value={q} onChange={(e) => setQ(e.target.value)} />
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <a href="#/markets" className="mb-4 inline-flex min-h-[36px] items-center gap-1.5 text-sm font-semibold text-muted hover:text-white">
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

  // The web wallet is a full-screen app, without the marketing chrome.
  if (path === "/wallet") {
    return (
      <Suspense fallback={<Loading />}>
        <div className="lg:py-6">
          <div className="mx-auto max-w-[440px] lg:overflow-hidden lg:rounded-[36px] lg:border lg:border-white/10">
            <WalletApp />
          </div>
          <a href="#/" className="mx-auto mt-4 hidden w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-white lg:flex">
            <Icon name="back" className="h-4 w-4" /> Back to site
          </a>
        </div>
      </Suspense>
    );
  }

  const coin = match("/coin/:symbol", path);
  let page;
  if (coin) page = <CoinPage symbol={coin.symbol} />;
  else if (path === "/markets") page = <MarketsPage />;
  else if (path === "/download") page = <div className="pb-4"><DownloadSection /><ExtensionPreview /></div>;
  else page = <Landing />;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header path={path} />
      <main className="flex-1">{page}</main>
      <Footer />
    </div>
  );
}
