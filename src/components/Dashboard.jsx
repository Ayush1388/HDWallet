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
import { GlowLine } from "../market/parts";
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

function HeroCard({ network, totals, loading, hidden, spark, onToggleHidden, onNetwork }) {
  const shown = useCountUp(totals.usd);
  const [whole, cents] = fmtUsd(shown).split(".");
  const up = totals.delta >= 0;
  return (
    <section className="card relative overflow-hidden p-5" aria-label="Portfolio balance">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={onToggleHidden} className="inline-flex min-h-[28px] items-center gap-2 text-[15px] font-medium text-muted" aria-pressed={hidden} aria-label={hidden ? "Show balances" : "Hide balances"}>
            Total balance <Icon name={hidden ? "eyeOff" : "eye"} className="h-4 w-4 text-muted" />
          </button>
        </div>
        <button
          onClick={() => onNetwork(network.id === "mainnet" ? "testnet" : "mainnet")}
          className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-[rgba(226,236,255,.08)] px-3 text-xs font-medium text-muted transition hover:text-fg"
          aria-label={`Network: ${network.label}. Switch network`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${network.id === "mainnet" ? "bg-up" : "bg-amber-300"}`} />
          {network.label}
        </button>
      </div>

      {loading && totals.usd === 0 ? (
        <div className="skeleton mt-5 h-10 w-48" />
      ) : (
        <p className="mt-5 truncate text-[40px] font-semibold leading-none tracking-tightest tabular" aria-live="polite">
          {hidden ? MASK : <>{whole}<span className="text-muted">.{cents}</span></>}
        </p>
      )}

      <div className="mt-5 flex items-end gap-4">
        <div className="min-w-0 flex-1">
          {spark && !hidden ? <GlowLine points={spark} className="h-20 w-full" /> : <div className="h-20 border-b border-dashed border-[rgba(226,236,255,.1)]" />}
        </div>
        <div className="shrink-0 border-l border-[rgba(226,236,255,.08)] pl-4">
          <p className="text-xs text-muted">24h change</p>
          <p className={`mt-1 text-sm tabular ${up ? "text-up" : "text-down"}`}>{hidden ? MASK : `${up ? "+" : "−"}${fmtUsd(Math.abs(totals.delta))}`}</p>
          <p className={`text-xs tabular ${up ? "text-up/80" : "text-down/80"}`}>{hidden ? "" : `${up ? "+" : "−"}${Math.abs(totals.pct).toFixed(2)}%`}</p>
        </div>
      </div>
      {network.id === "testnet" && !isDemo() && <p className="mt-3 text-xs text-muted">Testnet · assets have no market value</p>}
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
    <nav aria-label="Wallet actions" className="glass grid grid-cols-3 gap-1 rounded-[24px] p-1.5">
      {tiles.map((t) => (
        <button key={t.id} onClick={() => onAction(t.id)} className="relative flex min-h-[52px] items-center justify-center gap-2.5 rounded-[18px] text-sm font-semibold transition hover:bg-raised active:scale-[.97]">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-[rgba(226,236,255,.08)] bg-raised">
            <Icon name={t.icon} className="h-[18px] w-[18px]" strokeWidth={2} duo />
          </span>
          {t.label}
          {t.badge > 0 && <span className="absolute right-2 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink">{t.badge}</span>}
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
      <button onClick={onOpen} className="flex w-full items-center gap-3 rounded-[20px] border border-[rgba(226,236,255,.05)] bg-raised/60 px-3 py-3 text-left transition hover:border-[rgba(226,236,255,.14)]">
        <TokenIcon asset={row} size="h-10 w-10" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{row.name}</span>
          <Change value={row.change} className="text-[11px]" />
        </span>
        <span className="text-right">
          <span className="block font-medium tabular">{hidden ? MASK : row.price > 0 ? fmtUsd(row.usd) : "—"}</span>
          <span className="block text-xs text-muted tabular">{hidden ? MASK : `${fmtAmount(row.balance)} ${row.symbol}`} · {network[row.chain].name}</span>
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
      <a href={txUrl(item.chain, item.hash, network)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-[20px] border border-[rgba(226,236,255,.05)] bg-raised/60 px-3 py-3 transition hover:border-[rgba(226,236,255,.14)]">
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
      {[0, 1, 2].map((i) => <li key={i} className="skeleton h-[66px] rounded-[20px]" />)}
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
  // Fixed floating dock (not sticky) so it is always on screen, whatever the page length or scroll container.
  return (
    <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))]">
      <ul className="pointer-events-auto mx-auto flex max-w-[408px] items-center justify-between rounded-full border border-[rgba(226,236,255,.08)] bg-panel/90 p-1.5 shadow-dock backdrop-blur-xl">
        {NAV.map((n) => {
          const active = page === n.id;
          if (n.center) {
            return (
              <li key={n.id}>
                <button onClick={() => onNav(n.id)} aria-label={n.label} title={n.label} className="grid h-12 w-12 place-items-center rounded-full bg-fg text-ink transition hover:bg-white active:scale-95">
                  <Icon name={n.icon} className="h-5 w-5" strokeWidth={2.2} />
                </button>
              </li>
            );
          }
          return (
            <li key={n.id}>
              <button
                onClick={() => onNav(n.id)}
                aria-label={n.label}
                title={n.label}
                aria-current={active ? "page" : undefined}
                className={`flex h-12 items-center gap-2 rounded-full transition ${active ? "bg-raised px-4 text-accent" : "w-12 justify-center text-muted hover:text-fg"}`}
              >
                <Icon name={n.icon} className="h-5 w-5" />
                {active && <span className="text-sm font-medium text-fg">{n.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
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
          <button onClick={() => setModal({ type: "accounts" })} className="pill min-h-[44px] min-w-0 py-1.5 pl-1.5 pr-3" aria-label={`Account ${account.name}. Switch account`}>
            <Logo size="h-8 w-8" />
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-semibold leading-tight">{account.name}</span>
              <span className="block font-mono text-[10px] text-muted">{shorten(account.eth.address)}</span>
            </span>
            <Icon name="chevron" className="h-3.5 w-3.5 text-muted" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <button className="icon-btn" aria-label="Scan QR code" onClick={() => setModal({ type: "scan" })}><Icon name="scan" className="h-5 w-5" /></button>
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
                      <button onClick={() => setModal({ type: "send", assetId: coinHolding.id })} className="min-h-[46px] rounded-2xl bg-fg text-sm font-bold text-ink transition hover:bg-white">Send {coinHolding.symbol}</button>
                      <button onClick={() => setModal({ type: "receive", chain: coinHolding.chain })} className="glass min-h-[46px] rounded-2xl text-sm font-bold transition hover:border-[rgba(226,236,255,.16)]">Receive</button>
                    </div>
                  )
                }
              />
            ) : (
              <>
                <h1 className="mb-4 text-[28px] font-semibold tracking-tightest">Markets</h1>
                <MarketList onOpen={(s) => { setCoin(s); window.scrollTo(0, 0); }} />
              </>
            )}
          </div>
        )}

        {page === "activity" && (
          <div className="space-y-3 animate-rise">
            <h1 className="text-[28px] font-semibold tracking-tightest">Activity</h1>
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
