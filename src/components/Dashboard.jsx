import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Change, Icon, Logo, Notice, TokenIcon } from "./ui";
import { ReceiveSheet, ScanSheet, SendSheet } from "./sheets/Transfer";
import { StakeSheet } from "./sheets/Stake";
import { AccountsSheet, AssetSheet, NotificationsSheet, RevealSheet, SettingsSheet } from "./sheets/Misc";
import { useHoldings } from "../hooks/useHoldings";
import { useActivity } from "../hooks/useActivity";
import { useStakes } from "../hooks/useStakes";
import { detectChain, fmtAmount, fmtUsd, shorten, timeAgo, txUrl } from "../lib/chains";
import { COIN_BY_SYMBOL } from "../lib/market";
import { isDemo } from "../lib/demo";
import { useSparklines } from "../market/hooks";
import { Spark } from "../market/parts";
import { MarketList } from "../market/MarketList";
import { CoinView } from "../market/CoinView";

const MASK = "••••••";
const STABLES = ["USDC", "USDT", "DAI"];

/** Wallet tokens that map onto a Binance USDT pair (wrapped assets chart as their underlying). */
const marketSymbol = (sym) => ({ WETH: "ETH", wSOL: "SOL" })[sym] ?? (COIN_BY_SYMBOL[sym] ? sym : null);

function useCountUp(value) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - start) / 700);
      const v = a + (value - a) * (1 - (1 - p) ** 3);
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

/** 7-day portfolio value: Σ balance × price history; stablecoins/unlisted held at current value. */
function usePortfolioSpark(rows) {
  const charted = useMemo(() => rows.filter((r) => r.usd > 0 && marketSymbol(r.symbol) && !STABLES.includes(r.symbol)), [rows]);
  const sparks = useSparklines(charted.map((r) => `${marketSymbol(r.symbol)}USDT`));
  return useMemo(() => {
    const flat = rows.filter((r) => !charted.includes(r)).reduce((s, r) => s + r.usd, 0);
    const series = charted.map((r) => sparks[`${marketSymbol(r.symbol)}USDT`]);
    if (!charted.length || series.some((s) => !s)) return null;
    const n = Math.min(...series.map((s) => s.length));
    return Array.from({ length: n }, (_, i) => flat + charted.reduce((s, r, j) => s + r.balance * series[j][series[j].length - n + i], 0));
  }, [rows, charted, sparks]);
}

function HeroCard({ account, network, totals, loading, hidden, spark, onToggleHidden, onNetwork, onAccounts }) {
  const shown = useCountUp(totals.usd);
  const [whole, cents] = fmtUsd(shown).split(".");
  const up = totals.delta >= 0;
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-accent p-5 text-accent-ink" aria-label="Portfolio balance">
      <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/25 blur-2xl" />
      <div className="relative flex items-center justify-between gap-2">
        <button onClick={onAccounts} className="flex min-h-[40px] min-w-0 items-center gap-2.5 text-left" aria-label={`Account ${account.name}. Switch account`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-ink text-sm font-semibold text-accent">{account.name.slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-sm font-semibold">{account.name}<Icon name="chevron" className="h-3.5 w-3.5" strokeWidth={2.4} /></span>
            <span className="block truncate font-mono text-[11px] text-accent-ink/65">{shorten(account.eth.address)}</span>
          </span>
        </button>
        <button
          onClick={() => onNetwork(network.id === "mainnet" ? "testnet" : "mainnet")}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-accent-ink/10 px-3 text-xs font-semibold transition hover:bg-accent-ink/20"
          aria-label={`Network: ${network.label}. Switch network`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${network.id === "mainnet" ? "bg-accent-ink" : "bg-amber-600"}`} />
          {network.label}
        </button>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <button onClick={onToggleHidden} className="inline-flex min-h-[28px] items-center gap-1.5 text-xs font-medium text-accent-ink/70" aria-pressed={hidden} aria-label={hidden ? "Show balances" : "Hide balances"}>
            Total balance <Icon name={hidden ? "eyeOff" : "eye"} className="h-3.5 w-3.5" />
          </button>
          {loading && totals.usd === 0 ? (
            <div className="mt-1 h-10 w-44 animate-pulse rounded-lg bg-accent-ink/15" />
          ) : (
            <p className="truncate text-[36px] font-semibold leading-tight tracking-tightest tabular" aria-live="polite">
              {hidden ? MASK : <>{whole}<span className="text-accent-ink/45">.{cents}</span></>}
            </p>
          )}
        </div>
        {spark && !hidden && <Spark points={spark} stroke="#3C315B" className="mb-2 h-11 w-24 shrink-0" />}
      </div>
      <div className="relative mt-3 flex items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-accent-ink px-2.5 py-1 text-accent tabular">
          {hidden ? MASK : `${up ? "+" : "−"}${fmtUsd(Math.abs(totals.delta))} (${up ? "+" : "−"}${Math.abs(totals.pct).toFixed(2)}%)`}
        </span>
        <span className="text-accent-ink/70">Past 24 hours</span>
      </div>
      {network.id === "testnet" && !isDemo() && <p className="relative mt-2 text-[11px] font-medium text-accent-ink/70">Testnet assets have no market value</p>}
    </section>
  );
}

function Tiles({ claimCount, onAction }) {
  const tiles = [
    { id: "send", label: "Send", icon: "up" },
    { id: "receive", label: "Receive", icon: "down" },
    { id: "earn", label: "Earn", icon: "stake", badge: claimCount },
  ];
  return (
    <nav aria-label="Wallet actions" className="grid grid-cols-3 gap-3">
      {tiles.map((t) => (
        <button key={t.id} onClick={() => onAction(t.id)} className="glass relative flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-3xl text-sm font-medium transition hover:border-accent/30 active:scale-[.97]">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-[rgba(255,253,248,.12)] bg-white/[.04]">
            <Icon name={t.icon} className="h-5 w-5" />
          </span>
          {t.label}
          {t.badge > 0 && <span className="absolute right-3 top-3 grid h-5 min-w-[20px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink">{t.badge}</span>}
        </button>
      ))}
    </nav>
  );
}

function Chips({ options, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar flex gap-2 overflow-x-auto">
      {options.map(([id, text]) => (
        <button key={id} role="tab" aria-selected={value === id} onClick={() => onChange(id)} className={`chip shrink-0 ${value === id ? "chip-on" : "chip-off"}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

function HoldingRow({ row, network, hidden, onOpen }) {
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-center gap-3 rounded-2xl border border-[rgba(255,253,248,.05)] bg-white/[.03] px-3 py-2.5 text-left transition hover:border-[rgba(255,253,248,.14)]">
        <TokenIcon asset={row} size="h-10 w-10" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{row.symbol} <span className="text-xs font-normal text-muted">{network[row.chain].name}</span></span>
          <Change value={row.change} className="text-xs" />
        </span>
        <span className="text-right">
          <span className="block font-semibold tabular">{hidden ? MASK : fmtAmount(row.balance)}</span>
          <span className="block text-xs text-muted tabular">{hidden ? MASK : row.price > 0 ? fmtUsd(row.usd) : "—"}</span>
        </span>
      </button>
    </li>
  );
}

const ACT = {
  in: { icon: "down", label: (s) => `Received ${s}`, cls: "text-up bg-up/10", sign: "+" },
  out: { icon: "up", label: (s) => `Sent ${s}`, cls: "text-fg/90 bg-white/[.06]", sign: "−" },
  self: { icon: "refresh", label: () => "Self transfer", cls: "text-fg/90 bg-white/[.06]", sign: "" },
  contract: { icon: "contract", label: () => "Contract interaction", cls: "text-fg/90 bg-white/[.06]", sign: "" },
};

function ActivityRow({ item, network, hidden }) {
  const a = ACT[item.dir] ?? ACT.contract;
  const failed = item.status === "failed";
  const pending = item.status === "pending";
  return (
    <li>
      <a href={txUrl(item.chain, item.hash, network)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-[rgba(255,253,248,.05)] bg-white/[.03] px-3 py-2.5 transition hover:border-[rgba(255,253,248,.14)]">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${failed ? "bg-down/10 text-down" : a.cls}`}>
          <Icon name={failed ? "fail" : pending ? "clock" : a.icon} className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{a.label(item.symbol)}</span>
          <span className="block truncate text-xs text-muted">
            {pending ? "Pending" : failed ? "Failed" : timeAgo(item.time)} · {network[item.chain].name}{item.peer ? ` · ${shorten(item.peer)}` : ""}
          </span>
        </span>
        {item.amount > 0 && (
          <span className={`text-right text-sm font-bold tabular ${item.dir === "in" && !failed ? "text-up" : ""}`}>
            {hidden ? MASK : `${a.sign}${fmtAmount(item.amount)} ${item.symbol}`}
          </span>
        )}
      </a>
    </li>
  );
}

function SkeletonRows() {
  return (
    <ul className="space-y-2" aria-hidden="true">
      {[0, 1, 2].map((i) => <li key={i} className="skeleton h-[62px] rounded-2xl" />)}
    </ul>
  );
}

function HoldingIssues({ issues, network, onSettings }) {
  if (!issues.length) return null;
  const splBlocked = issues.includes("sol-tokens") && !network.sol.custom;
  const other = issues.filter((i) => i !== "sol-tokens" || network.sol.custom);
  return (
    <div className="mt-3 space-y-2 px-2 text-center text-xs text-muted">
      {splBlocked && (
        <p>
          The public {network.sol.name} RPC doesn't allow token lookups, so SPL tokens aren't shown.{" "}
          <button onClick={onSettings} className="font-bold text-accent hover:underline">Add a custom RPC</button>
        </p>
      )}
      {other.length > 0 && <p>Some data couldn't be loaded — public RPCs and price feeds can rate-limit. Retrying automatically.</p>}
    </div>
  );
}

function ActivityList({ activity, chain, network, hidden }) {
  const items = activity.items.filter((i) => chain === "all" || i.chain === chain);
  return (
    <>
      {activity.loading && items.length === 0 ? (
        <SkeletonRows />
      ) : items.length === 0 ? (
        <div className="py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/5 text-muted"><Icon name="clock" className="h-6 w-6" /></span>
          <p className="mt-3 text-sm text-muted">No transactions yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">{items.map((i) => <ActivityRow key={i.id} item={i} network={network} hidden={hidden} />)}</ul>
      )}
      {activity.errors.length > 0 && (
        <p className="mt-3 text-center text-xs text-muted">Couldn't load {activity.errors.map((c) => network[c].name).join(" and ")} history right now.</p>
      )}
    </>
  );
}

const NAV = [
  { id: "home", label: "Home", icon: "home" },
  { id: "markets", label: "Markets", icon: "bars" },
  { id: "transfer", label: "Transfer", icon: "swap", center: true },
  { id: "earn", label: "Earn", icon: "stake" },
  { id: "activity", label: "Activity", icon: "clock" },
];

function BottomNav({ page, onNav }) {
  // Fixed (not sticky) so it is always on screen regardless of page length or scroll container.
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto max-w-[440px] border-t border-[rgba(255,253,248,.07)] bg-ink/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <ul className="grid grid-cols-5 items-end">
          {NAV.map((n) => (
            <li key={n.id} className="flex justify-center">
              {n.center ? (
                <button onClick={() => onNav(n.id)} aria-label={n.label} className="-mt-5 grid h-14 w-14 place-items-center rounded-full border-2 border-accent bg-ink text-accent shadow-glow transition active:scale-95">
                  <Icon name={n.icon} className="h-6 w-6" strokeWidth={2} />
                </button>
              ) : (
                <button onClick={() => onNav(n.id)} aria-current={page === n.id ? "page" : undefined} className={`flex min-h-[48px] min-w-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${page === n.id ? "text-accent" : "text-muted hover:text-fg"}`}>
                  <Icon name={n.icon} className="h-5 w-5" />
                  {n.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default function Dashboard({
  accounts, mnemonic, network, setNetwork, prefs, setPref, rpc, onRpc,
  notifications, notify, clearNotifications, markNotificationsRead,
  onAddAccount, onRename, onLock, onReset, onChangePassword,
}) {
  const [activeIndex, setActiveIndex] = useState(() => {
    const saved = Number(localStorage.getItem("hdwallet.active"));
    return accounts.some((a) => a.index === saved) ? saved : accounts[0].index;
  });
  const account = accounts.find((a) => a.index === activeIndex) ?? accounts[0];
  const [page, setPage] = useState("home");
  const [coin, setCoin] = useState(null);
  const [homeTab, setHomeTab] = useState("tokens");
  const [chain, setChain] = useState("all");
  const [modal, setModal] = useState(null);
  const [localTxs, setLocalTxs] = useState([]);
  const hidden = prefs.hideBalances;
  const key = `${network.id}:${account.index}`;

  const { rows, totals, loading, issues, refresh } = useHoldings(account, network);
  const activity = useActivity(account, network, page === "activity" || homeTab === "activity", localTxs);
  const { stakes, loading: stakesLoading, error: stakesError, refresh: refreshStakes } = useStakes(account, network);
  const claimCount = stakes.filter((s) => s.state === "inactive").length;
  const spark = usePortfolioSpark(rows);

  const selectAccount = (i) => {
    setActiveIndex(i);
    localStorage.setItem("hdwallet.active", String(i));
  };

  // Notify on incoming funds (balance increases between refreshes).
  const snapshots = useRef({});
  useEffect(() => {
    if (loading || !rows.length) return;
    const prev = snapshots.current[key];
    if (prev) {
      for (const r of rows) {
        const before = prev[r.id] ?? 0;
        if (r.balance - before > 1e-9) {
          notify({ kind: "in", title: `Received ${fmtAmount(r.balance - before)} ${r.symbol}`, body: `${account.name} · ${network[r.chain].name}` });
        }
      }
    }
    snapshots.current[key] = Object.fromEntries(rows.map((r) => [r.id, r.balance]));
  }, [rows, loading, key, account.name, network, notify]);

  const visibleRows = useMemo(() => [...rows].sort((a, b) => b.usd - a.usd || b.balance - a.balance), [rows]);

  const close = useCallback(() => setModal(null), []);
  const onScan = useCallback((addr) => setModal({ type: "send", assetId: detectChain(addr) ?? "eth", to: addr }), []);

  const onSent = ({ asset, amount, to, hash }) => {
    notify({ kind: "out", title: `Sent ${fmtAmount(amount)} ${asset.symbol}`, body: `To ${shorten(to)} · ${network[asset.chain].name}`, url: txUrl(asset.chain, hash, network) });
    setLocalTxs((t) => [{ key, id: hash, hash, chain: asset.chain, dir: "out", symbol: asset.symbol, amount, time: Date.now(), status: "pending", peer: to }, ...t]);
    setTimeout(() => {
      refresh();
      activity.refresh();
    }, 4000);
  };

  const onStakeChanged = ({ hash, label }) => {
    notify({ kind: "stake", title: label, body: network.sol.name, url: txUrl("sol", hash, network) });
    refresh();
    refreshStakes();
  };

  const unread = notifications.filter((n) => !n.read).length;
  const sol = rows.find((r) => r.id === "sol");

  const onAction = (id) => {
    if (id === "send" || id === "transfer") setModal({ type: "send" });
    if (id === "receive") setModal({ type: "receive" });
    if (id === "earn") setModal({ type: "stake", tab: claimCount ? "positions" : "stake" });
  };

  const onNav = (id) => {
    if (id === "transfer" || id === "earn") return onAction(id);
    setPage(id);
    if (id === "markets") setCoin(null);
    window.scrollTo(0, 0);
  };

  const openChart = (symbol) => {
    setModal(null);
    setPage("markets");
    setCoin(symbol);
    window.scrollTo(0, 0);
  };

  // The wallet holding that matches the coin open in Markets, for Send/Receive shortcuts.
  const coinHolding = coin ? rows.find((r) => marketSymbol(r.symbol) === coin) : null;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-ink/85 px-4 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        {page === "markets" && coin ? (
          <button onClick={() => setCoin(null)} className="icon-btn" aria-label="Back to markets"><Icon name="back" className="h-5 w-5" /></button>
        ) : (
          <button onClick={() => setModal({ type: "accounts" })} className="flex min-h-[44px] items-center gap-2.5" aria-label={`Account ${account.name}. Switch account`}>
            <Logo size="h-11 w-11" />
            <span className="text-lg font-semibold tracking-tight">{{ home: "Wallet", markets: "Markets", activity: "Activity" }[page]}</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <button className="icon-btn" aria-label="Scan QR code" onClick={() => setModal({ type: "scan" })}><Icon name="scan" className="h-5 w-5" /></button>
          <button className="icon-btn" aria-label="Settings" onClick={() => setModal({ type: "settings" })}><Icon name="settings" className="h-5 w-5" /></button>
          <button
            className="icon-btn relative"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            onClick={() => { setModal({ type: "notifications" }); markNotificationsRead(); }}
          >
            <Icon name="bell" className="h-5 w-5" />
            {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-ink" />}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28">
        {isDemo() && page === "home" && <div className="mb-4"><Notice tone="info">Demo mode — sample data, nothing is saved. Lock to exit.</Notice></div>}

        {page === "home" && (
          <div key={key} className="space-y-4 animate-rise">
            <HeroCard
              account={account}
              onAccounts={() => setModal({ type: "accounts" })}
              network={network}
              totals={totals}
              loading={loading}
              hidden={hidden}
              spark={spark}
              onToggleHidden={() => setPref("hideBalances", !hidden)}
              onNetwork={setNetwork}
            />
            <Tiles claimCount={claimCount} onAction={onAction} />
            <section className="card p-3" aria-label="Portfolio">
              <div className="mb-3 flex items-center justify-between gap-2">
                <Chips label="Portfolio view" value={homeTab} onChange={setHomeTab} options={[["tokens", "Tokens"], ["activity", "Activity"]]} />
                <div className="flex items-center gap-1">
                  <button aria-label="Refresh" onClick={() => { refresh(); activity.refresh(); refreshStakes(); }} className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/5 hover:text-fg">
                    <Icon name="refresh" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
              {homeTab === "tokens" ? (
                <>
                  {loading && rows.length === 0 ? (
                    <SkeletonRows />
                  ) : visibleRows.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted">No assets yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {visibleRows.map((r) => (
                        <HoldingRow key={r.id} row={r} network={network} hidden={hidden} onOpen={() => setModal({ type: "asset", assetId: r.id })} />
                      ))}
                    </ul>
                  )}
                  <HoldingIssues issues={issues} network={network} onSettings={() => setModal({ type: "settings" })} />
                </>
              ) : (
                <ActivityList activity={activity} chain="all" network={network} hidden={hidden} />
              )}
            </section>
          </div>
        )}

        {page === "markets" && (
          <div className="animate-rise">
            {coin ? (
              <CoinView
                key={coin}
                symbol={coin}
                variant="compact"
                actions={
                  coinHolding && (
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setModal({ type: "send", assetId: coinHolding.id })} className="min-h-[46px] rounded-2xl bg-accent text-sm font-semibold text-accent-ink transition hover:brightness-110">Send {coinHolding.symbol}</button>
                      <button onClick={() => setModal({ type: "receive", chain: coinHolding.chain })} className="glass min-h-[46px] rounded-2xl text-sm font-bold transition hover:border-[rgba(255,253,248,.16)]">Receive</button>
                    </div>
                  )
                }
              />
            ) : (
              <>
                <MarketList onOpen={(s) => { setCoin(s); window.scrollTo(0, 0); }} />
              </>
            )}
          </div>
        )}

        {page === "activity" && (
          <div className="space-y-3 animate-rise">
            <Chips label="Chain" value={chain} onChange={setChain} options={[["all", "All"], ["eth", network.eth.name], ["sol", network.sol.name]]} />
            <ActivityList activity={activity} chain={chain} network={network} hidden={hidden} />
          </div>
        )}
      </main>

      <BottomNav page={page} onNav={onNav} />

      {modal?.type === "send" && (
        <SendSheet account={account} rows={rows} network={network} initialAssetId={modal.assetId} initialTo={modal.to} onClose={close} onSent={onSent} />
      )}
      {modal?.type === "receive" && <ReceiveSheet account={account} network={network} initialChain={modal.chain} onClose={close} />}
      {modal?.type === "scan" && <ScanSheet onResult={onScan} onClose={close} />}
      {modal?.type === "stake" && (
        <StakeSheet
          account={account}
          network={network}
          sol={sol}
          stakes={stakes}
          stakesLoading={stakesLoading}
          stakesError={stakesError}
          onSettings={() => setModal({ type: "settings" })}
          initialTab={modal.tab}
          onChanged={onStakeChanged}
          onClose={close}
        />
      )}
      {modal?.type === "asset" && (() => {
        const asset = rows.find((r) => r.id === modal.assetId);
        if (!asset) return null;
        const ms = marketSymbol(asset.symbol);
        return (
          <AssetSheet
            asset={asset}
            account={account}
            network={network}
            hidden={hidden}
            onSend={() => setModal({ type: "send", assetId: asset.id })}
            onReceive={() => setModal({ type: "receive", chain: asset.chain })}
            chart={ms && !STABLES.includes(ms) ? { symbol: ms, open: () => openChart(ms) } : null}
            onShowKey={asset.address ? null : () => setModal({ type: "key", chain: asset.chain })}
            onClose={close}
          />
        );
      })()}
      {modal?.type === "accounts" && (
        <AccountsSheet
          accounts={accounts}
          activeIndex={account.index}
          network={network}
          onNetwork={setNetwork}
          onSelect={selectAccount}
          onAdd={async () => selectAccount((await onAddAccount()).index)}
          onRename={onRename}
          onSettings={() => setModal({ type: "settings" })}
          onLock={onLock}
          onClose={close}
        />
      )}
      {modal?.type === "notifications" && <NotificationsSheet items={notifications} onClear={clearNotifications} onClose={close} />}
      {modal?.type === "settings" && (
        <SettingsSheet
          network={network}
          rpc={rpc}
          onRpc={onRpc}
          prefs={prefs}
          setPref={setPref}
          onReveal={() => setModal({ type: "phrase" })}
          onChangePassword={onChangePassword}
          onLock={onLock}
          onReset={onReset}
          onClose={close}
        />
      )}
      {modal?.type === "phrase" && (
        <RevealSheet title="Recovery phrase" secret={mnemonic} warning="Anyone with this phrase can take everything in every account. Make sure nobody is watching your screen." onClose={close} />
      )}
      {modal?.type === "key" && (
        <RevealSheet
          title={`${modal.chain === "eth" ? "Ethereum" : "Solana"} private key`}
          secret={account[modal.chain].privateKey}
          warning="Anyone with this key can take everything in this account. Never share it or paste it into a website."
          onClose={close}
        />
      )}
    </div>
  );
}
