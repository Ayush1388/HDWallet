import { Suspense, lazy, useEffect, useState } from "react";
import { Icon, Logo, Spinner } from "../components/ui";
import { match, navigate, useRoute } from "../lib/router";
import { COIN_BY_SYMBOL } from "../lib/market";
import { MarketTable } from "../market/MarketList";

const CoinView = lazy(() => import("../market/CoinView").then((m) => ({ default: m.CoinView })));
const WalletApp = lazy(() => import("../wallet/WalletApp"));

export const EXTENSION_ZIP = "downloads/aurum-wallet-extension.zip";
export const DEMO_URL = "./?demo#/wallet";

// Layout follows the phantom.com taste analysis: colour-blocked sections, a dark hero card
// inset from the viewport, weight-400 display type with tight tracking, purple ink, pill controls.
const GUTTER = "px-4 sm:px-8 lg:px-12";
const PILL = "inline-flex items-center justify-center gap-2 rounded-full transition duration-300 ease-phantom";

const Loading = () => <div className="grid min-h-[50vh] place-items-center text-site-muted"><Spinner className="h-6 w-6" /></div>;

function Header({ path }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["/markets", "Markets"],
    ["/wallet", "Web wallet"],
    ["/download", "Download"],
  ];
  const active = (p) => path === p || (p === "/markets" && path.startsWith("/coin/"));
  return (
    <header className={`relative z-40 ${GUTTER} py-3`}>
      <div className="flex h-[60px] items-center justify-between gap-4">
        <a href="#/" className="flex items-center gap-2 text-site-ink" aria-label="Aurum home">
          <Logo size="h-9 w-9" />
          <span className="text-[26px] font-medium tracking-tightest">aurum</span>
        </a>
        <nav className="hidden h-[60px] items-center rounded-full bg-white px-2 shadow-[0_1px_2px_rgba(60,49,91,.06)] md:flex" aria-label="Primary">
          {links.map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              aria-current={active(href) ? "page" : undefined}
              className={`rounded-full px-6 py-3 text-[15px] transition ${active(href) ? "bg-site-lavsoft text-site-ink" : "text-site-ink hover:bg-site-soft"}`}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="#/download" className={`${PILL} hidden h-[52px] bg-site-lav px-8 text-[15px] text-site-ink hover:bg-site-lavsoft sm:inline-flex`}>
            Download
          </a>
          <button className="grid h-12 w-12 place-items-center rounded-full bg-white text-site-ink md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <Icon name={open ? "x" : "menu"} className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="mt-2 rounded-[24px] bg-white p-2 md:hidden" aria-label="Mobile">
          {links.map(([href, label]) => (
            <a key={href} href={`#${href}`} onClick={() => setOpen(false)} className="block rounded-full px-5 py-3 text-site-ink hover:bg-site-soft">{label}</a>
          ))}
        </nav>
      )}
    </header>
  );
}

/** Dark card inset from the page, with Phantom-style crosshair rules and a single light streak. */
function Hero() {
  return (
    <section className={`${GUTTER} pt-4`}>
      <div className="relative isolate flex min-h-[min(720px,82vh)] flex-col items-center justify-center overflow-hidden rounded-[32px] bg-site-dark px-6 py-24 text-center text-site-cream">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[34%] top-0 h-full border-l border-dashed border-white/10" />
          <div className="absolute left-0 top-[39%] w-full border-t border-dashed border-white/10" />
          <div className="absolute left-[34%] top-[39%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
          <div className="absolute -left-[10%] bottom-[-30%] h-[3px] w-[70%] origin-left -rotate-[38deg] bg-gradient-to-r from-transparent via-site-lav to-transparent opacity-70 blur-[1px]" />
          <div className="absolute -left-[10%] bottom-[-30%] h-24 w-[70%] origin-left -rotate-[38deg] bg-gradient-to-r from-transparent via-site-lav/25 to-transparent blur-2xl" />
        </div>
        <p className="text-lg text-site-cream/75 sm:text-[22px]">The wallet that lives in your browser</p>
        <h1 className="mt-5 max-w-5xl text-[44px] font-normal leading-[1.08] tracking-display sm:text-[64px] lg:text-[80px]">
          Your keys, every market, one extension
        </h1>
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <a href="#/download" className={`${PILL} h-[72px] bg-site-lavsoft px-9 text-lg text-site-ink hover:bg-white`}>
            <Icon name="down" className="h-5 w-5" /> Add to Chrome
          </a>
          <a href="#preview" onClick={(e) => { e.preventDefault(); document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" }); }} className={`${PILL} h-[72px] px-7 text-lg text-site-cream/85 hover:text-site-cream`}>
            Try it live <Icon name="send" className="h-4 w-4" />
          </a>
        </div>
        <p className="mt-10 text-sm text-site-cream/50">Ethereum · Solana · Free · Your keys never leave your device</p>
      </div>
    </section>
  );
}

/** The real extension running in demo mode, on a lavender block like Phantom's device showcase. */
function ExtensionPreview() {
  const points = [
    ["home", "Home", "Balance, 24h change and every token"],
    ["bars", "Markets", "Live candles and order books"],
    ["swap", "Transfer", "Any token, live network fees"],
    ["stake", "Earn", "Stake SOL, claim rewards"],
  ];
  return (
    <section id="preview" className={`${GUTTER} scroll-mt-24 pt-28`}>
      <div className="mx-auto max-w-4xl text-center text-site-ink">
        <h2 className="text-[40px] font-normal leading-[1.1] tracking-display sm:text-[64px]">This is the extension.<br />Go ahead, tap around.</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-site-muted">The window below is the real popup running with sample balances. Markets and charts are live.</p>
      </div>
      <div className="mt-12 rounded-[32px] bg-site-lav px-4 pb-0 pt-12 sm:px-10">
        <div className="mx-auto w-[392px] max-w-full overflow-hidden rounded-t-[24px] border border-b-0 border-black/10 bg-[#2a2a2a] shadow-[0_-20px_60px_-20px_rgba(60,49,91,.45)]">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-white/20" /><i className="h-2.5 w-2.5 rounded-full bg-white/20" /><i className="h-2.5 w-2.5 rounded-full bg-white/20" /></span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-white/[.08] px-2.5 py-1 text-[11px] text-site-cream/80"><Logo size="h-4 w-4" /> Aurum Wallet</span>
          </div>
          <iframe title="Aurum extension live demo" src={DEMO_URL} loading="lazy" className="block h-[600px] w-full bg-ink" />
        </div>
      </div>
      <ul className="mx-auto mt-6 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {points.map(([icon, title, text]) => (
          <li key={title} className="rounded-[24px] bg-site-soft p-5 text-site-ink">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-site-lavsoft"><Icon name={icon} className="h-[18px] w-[18px]" /></span>
            <p className="mt-4 text-lg">{title}</p>
            <p className="text-sm text-site-muted">{text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 text-center">
        <a href={DEMO_URL} target="_blank" rel="noreferrer" className={`${PILL} h-[52px] bg-site-lavsoft px-7 text-site-ink hover:bg-site-lav`}>
          Open the demo full screen <Icon name="external" className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

function MarketsTeaser() {
  return (
    <section className={`${GUTTER} pt-28`}>
      <div className="mb-8 flex flex-col items-start justify-between gap-4 text-site-ink sm:flex-row sm:items-end">
        <h2 className="text-[40px] font-normal leading-[1.1] tracking-display sm:text-[64px]">Every market,<br />live.</h2>
        <a href="#/markets" className={`${PILL} h-[52px] bg-site-lavsoft px-7 text-site-ink hover:bg-site-lav`}>
          All markets <Icon name="send" className="h-4 w-4" />
        </a>
      </div>
      <MarketTable limit={8} onOpen={(s) => navigate(`/coin/${s}`)} />
    </section>
  );
}

const FEATURES = [
  ["shield", "Non-custodial", "Your recovery phrase is encrypted with AES-256 on your device. We never see your keys."],
  ["bars", "Pro charts", "Candlesticks, order books and live trades for every listed coin."],
  ["key", "One phrase, two chains", "Unlimited Ethereum and Solana accounts from a single recovery phrase."],
  ["swap", "Send anything", "ETH, SOL, ERC-20 and SPL tokens with live fee estimates."],
  ["stake", "Earn", "Delegate SOL to top validators, unstake and claim in one place."],
  ["lock", "Auto-lock", "Locks itself after inactivity and forgets the session when the browser closes."],
];

/** Full-bleed deep-purple chapter with the logo set inline in the headline. */
function Security() {
  return (
    <section className="mt-28 bg-site-ink py-28 text-site-cream">
      <div className={`${GUTTER} mx-auto max-w-7xl`}>
        <h2 className="mx-auto max-w-5xl text-center text-[40px] font-normal leading-[1.15] tracking-display sm:text-[64px] lg:text-[80px]">
          Controlled by you, <span className="inline-block translate-y-1 align-middle"><Logo size="h-12 w-12 sm:h-20 sm:w-20" /></span> secured by math
        </h2>
        <div className="mt-20 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([icon, title, text]) => (
            <div key={title}>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-site-lav text-site-ink"><Icon name={icon} className="h-5 w-5" /></span>
              <h3 className="mt-5 text-2xl font-normal tracking-tight">{title}</h3>
              <p className="mt-2 leading-relaxed text-site-cream/65">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Lavender chapter: the download CTA + install steps, flowing into the footer card. */
function GetStarted() {
  const steps = [
    ["Download", "Get the package and unzip it."],
    ["Open extensions", "Go to chrome://extensions (or edge:// / brave://)."],
    ["Developer mode", "Switch it on in the top-right corner."],
    ["Load unpacked", "Pick the unzipped folder, then pin Aurum."],
  ];
  return (
    <section id="download" className="scroll-mt-24 bg-site-lav pb-12 pt-28 text-site-ink">
      <div className={`${GUTTER} text-center`}>
        <p className="text-lg text-site-ink/70 sm:text-xl">Free and open source. Works in Chrome, Edge, Brave and Arc.</p>
        <h2 className="mt-4 text-[48px] font-normal leading-[1.08] tracking-display sm:text-[80px] lg:text-[96px]">
          Get started.<br />
          Download <span className="inline-block translate-y-1 align-middle"><span className="inline-grid h-14 w-14 place-items-center rounded-[30%] bg-site-cream sm:h-24 sm:w-24"><svg viewBox="0 0 24 24" className="h-3/5 w-3/5" fill="none" stroke="#3C315B" strokeWidth="2.6" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7.5 4.25v9.5L12 21l-7.5-4.25v-9.5z" /></svg></span></span> Aurum.
        </h2>
        <a href={EXTENSION_ZIP} download className={`${PILL} mt-12 h-[80px] bg-white px-10 text-lg text-site-ink hover:bg-site-cream`}>
          <Icon name="down" className="h-5 w-5" /> Download for Chrome
        </a>
        <p className="mt-4 text-sm text-site-ink/60">Version 1.0.0 · Manifest V3 · 650 KB</p>
        <ol className="mx-auto mt-16 grid max-w-6xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, text], i) => (
            <li key={title} className="rounded-[24px] bg-white/55 p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-site-ink text-sm text-site-cream">{i + 1}</span>
              <p className="mt-4 text-lg">{title}</p>
              <p className="text-sm text-site-ink/65">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    ["Product", [["Download", "#/download"], ["Web wallet", "#/wallet"], ["Live demo", DEMO_URL]]],
    ["Markets", [["All markets", "#/markets"], ["Bitcoin", "#/coin/BTC"], ["Ethereum", "#/coin/ETH"], ["Solana", "#/coin/SOL"]]],
    ["Data", [["Binance market data", "https://www.binance.com"], ["TradingView charts", "https://www.tradingview.com/lightweight-charts/"]]],
  ];
  return (
    <footer className={`bg-site-lav ${GUTTER} pb-6`}>
      <div className="rounded-[32px] bg-site-bg p-8 text-site-ink sm:p-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div>
            <Logo size="h-14 w-14" />
            <p className="mt-6 max-w-xs text-site-muted">A non-custodial wallet for Ethereum and Solana. Not financial advice.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {cols.map(([title, links]) => (
              <div key={title}>
                <p className="text-site-muted">{title}</p>
                <ul className="mt-3 space-y-2">
                  {links.map(([label, href]) => (
                    <li key={label}><a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})} className="hover:underline">{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <span className="mt-12 inline-flex items-center gap-2 rounded-full bg-site-soft px-4 py-2 text-sm"><span className="h-2 w-2 rounded-full bg-up" /> Markets live</span>
      </div>
      <p className="mt-4 text-sm text-site-ink/70">© Aurum 2026</p>
    </footer>
  );
}

function MarketsPage() {
  const [q, setQ] = useState("");
  return (
    <div className={`${GUTTER} pb-24 pt-10`}>
      <div className="mb-8 flex flex-col gap-6 text-site-ink sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[48px] font-normal leading-none tracking-display sm:text-[72px]">Markets</h1>
          <p className="mt-3 text-lg text-site-muted">Live USDT spot prices. Pick a coin for candles, order book and trades.</p>
        </div>
        <label className="relative w-full sm:w-80">
          <span className="sr-only">Search coins</span>
          <Icon name="search" className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-site-muted" />
          <input className="h-[52px] w-full rounded-full border border-site-ink/10 bg-white pl-12 pr-5 text-site-ink placeholder:text-site-muted focus:border-site-lav focus:outline-none focus:ring-4 focus:ring-site-lavsoft" placeholder="Search coin" value={q} onChange={(e) => setQ(e.target.value)} />
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
    <div className={`${GUTTER} pb-24 pt-6`}>
      <a href="#/markets" className={`${PILL} mb-5 h-11 bg-white px-5 text-sm text-site-ink hover:bg-site-lavsoft`}>
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

  // The marketing site is light; the wallet keeps the app's dark surface.
  useEffect(() => {
    const b = document.body.style;
    b.backgroundColor = isWallet ? "" : "#FDFCFE";
    b.backgroundImage = isWallet ? "" : "none";
    b.color = isWallet ? "" : "#3C315B";
  }, [isWallet]);

  if (isWallet) {
    return (
      <Suspense fallback={<Loading />}>
        <>
          <WalletApp />
          <a href="#/" className="fixed left-6 top-6 z-40 hidden items-center gap-1.5 rounded-full border border-[rgba(255,253,248,.08)] bg-panel px-4 py-2 text-sm text-muted transition hover:text-fg lg:inline-flex">
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
  else page = <><Hero /><ExtensionPreview /><MarketsTeaser /><Security /><GetStarted /></>;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-site-bg text-site-ink">
      <Header path={path} />
      <main className="flex-1">{page}</main>
      <Footer />
    </div>
  );
}
