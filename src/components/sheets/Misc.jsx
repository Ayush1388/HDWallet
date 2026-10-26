import { useEffect, useState } from "react";
import { Button, Change, CopyButton, Icon, Modal, Notice, Segmented, TokenIcon } from "../ui";
import { NETWORKS, addressUrl, fmtAmount, fmtUsd, getSparkline, shorten, timeAgo } from "../../lib/chains";
import { passwordScore, verifyPassword } from "../../lib/vault";
import { isDemo } from "../../lib/demo";
import { PriceChart } from "../../market/PriceChart";

/** Password-gated display of a secret (recovery phrase or private key). */
export function RevealSheet({ title, secret, warning, onClose }) {
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(isDemo());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (await verifyPassword(password)) setShown(true);
    else setError("Incorrect password.");
    setBusy(false);
  };

  const words = secret.includes(" ") ? secret.split(" ") : null;

  return (
    <Modal title={title} onClose={onClose}>
      <Notice tone="danger">{warning}</Notice>
      {shown ? (
        <div className="mt-4">
          {words ? (
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {words.map((w, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl border border-white/[.06] bg-ink/50 px-3 py-2 font-mono text-sm">
                  <span className="w-5 text-right text-xs text-muted">{i + 1}</span>{w}
                </li>
              ))}
            </ol>
          ) : (
            <p className="break-all rounded-2xl border border-white/[.06] bg-ink/50 p-4 font-mono text-sm leading-relaxed">{secret}</p>
          )}
          <div className="mt-3 flex justify-between">
            <CopyButton value={secret} label="Copy" />
            <Button variant="ghost" onClick={onClose} className="min-h-[36px] py-1 text-xs">Hide</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4">
          <label className="label" htmlFor="rp">Enter password to continue</label>
          <input id="rp" type="password" autoFocus className="input" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} />
          {error && <p className="mt-2 text-sm text-down" role="alert">{error}</p>}
          <Button type="submit" loading={busy} disabled={!password} className="mt-4 w-full">Reveal</Button>
        </form>
      )}
    </Modal>
  );
}

export function AccountsSheet({ accounts, activeIndex, network, onNetwork, onSelect, onAdd, onRename, onSettings, onLock, onClose }) {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const commit = (a) => {
    const v = name.trim();
    if (v && v !== a.name) onRename(a.index, v);
    setEditing(null);
  };
  const add = async () => {
    setAdding(true);
    await onAdd();
    setAdding(false);
  };

  return (
    <Modal title="Accounts" onClose={onClose}>
      <Segmented
        label="Network"
        value={network.id}
        onChange={onNetwork}
        className="mb-4 flex w-full"
        options={Object.values(NETWORKS).map((n) => ({ value: n.id, label: n.label }))}
      />
      <ul className="space-y-2">
        {accounts.map((a) => {
          const active = a.index === activeIndex;
          return (
            <li key={a.index} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${active ? "border-[rgba(255,255,255,.22)] bg-raised" : "border-white/[.06] bg-ink/40 hover:border-white/15"}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[rgba(255,255,255,.1)] bg-raised text-sm font-semibold">
                {a.name.slice(0, 1).toUpperCase()}
              </span>
              {editing === a.index ? (
                <input autoFocus aria-label="Account name" maxLength={24} className="input py-2" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => commit(a)} onKeyDown={(e) => e.key === "Enter" && commit(a)} />
              ) : (
                <button className="min-w-0 flex-1 text-left" onClick={() => { onSelect(a.index); onClose(); }} aria-current={active}>
                  <span className="block truncate font-bold">{a.name}</span>
                  <span className="block truncate font-mono text-xs text-muted">{shorten(a.eth.address)} · {shorten(a.sol.address)}</span>
                </button>
              )}
              {active && editing !== a.index && <Icon name="check" className="h-4 w-4 text-accent" />}
              <button aria-label={`Rename ${a.name}`} onClick={() => { setName(a.name); setEditing(a.index); }} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-fg">
                <Icon name="pencil" />
              </button>
            </li>
          );
        })}
      </ul>
      <Button variant="secondary" icon="plus" loading={adding} onClick={add} className="mt-3 w-full border-dashed">Add account</Button>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="ghost" icon="settings" onClick={onSettings}>Settings</Button>
        <Button variant="ghost" icon="lock" onClick={onLock}>Lock</Button>
      </div>
    </Modal>
  );
}

const NOTE_ICON = { in: "down", out: "up", stake: "stake", info: "shield" };

export function NotificationsSheet({ items, onClear, onClose }) {
  return (
    <Modal title="Notifications" onClose={onClose}>
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/5 text-muted"><Icon name="bell" className="h-6 w-6" /></span>
          <p className="mt-3 text-sm text-muted">You're all caught up.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id} className="flex gap-3 rounded-2xl border border-white/[.06] bg-ink/40 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[rgba(255,255,255,.08)] bg-raised"><Icon name={NOTE_ICON[n.kind] ?? "bell"} duo /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{n.title}</p>
                  {n.body && <p className="truncate text-xs text-muted">{n.body}</p>}
                  <p className="mt-0.5 text-[11px] text-muted/80">{timeAgo(n.time)}</p>
                </div>
                {n.url && (
                  <a href={n.url} target="_blank" rel="noreferrer" aria-label="Open in explorer" className="grid h-9 w-9 place-items-center self-center rounded-full text-muted hover:bg-white/5 hover:text-fg">
                    <Icon name="external" />
                  </a>
                )}
              </li>
            ))}
          </ul>
          <Button variant="ghost" onClick={onClear} className="mt-3 w-full">Clear all</Button>
        </>
      )}
    </Modal>
  );
}

function Sparkline({ points, up }) {
  if (!points?.length) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const w = 320;
  const h = 96;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - ((p - min) / (max - min || 1)) * (h - 8) - 4]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const color = up ? "#2ee07c" : "#f6465d";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" preserveAspectRatio="none" role="img" aria-label={`7 day price trend, ${up ? "up" : "down"}`}>
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${w},${h}L0,${h}Z`} fill="url(#spark)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** `chart`: { symbol, open } when the asset trades on Binance — shows a live chart instead of the 7d sparkline. */
export function AssetSheet({ asset, account, network, hidden, chart, onSend, onReceive, onShowKey, onClose }) {
  const [points, setPoints] = useState(null);
  useEffect(() => {
    if (!asset.priceId || chart) return;
    let live = true;
    getSparkline(asset.priceId).then((p) => live && setPoints(p)).catch(() => live && setPoints([]));
    return () => {
      live = false;
    };
  }, [asset.priceId, chart]);

  const up = points?.length ? points[points.length - 1] >= points[0] : (asset.change ?? 0) >= 0;
  const holder = account[asset.chain].address;

  return (
    <Modal title={asset.name} onClose={onClose}>
      <div className="flex items-center gap-4">
        <TokenIcon asset={asset} size="h-14 w-14" />
        <div>
          <p className="text-2xl font-semibold tabular-nums">{hidden ? "••••" : fmtAmount(asset.balance)} <span className="text-base text-muted">{asset.symbol}</span></p>
          <p className="text-sm text-muted">{hidden ? "••••" : fmtUsd(asset.usd)} · {network[asset.chain].name}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/[.06] bg-ink/40 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted">Price</p>
          <p className="font-bold tabular-nums">{asset.price > 0 ? fmtUsd(asset.price) : network.id === "testnet" ? "Test asset" : "—"} <Change value={asset.change} className="ml-1 text-xs" /></p>
        </div>
        {chart ? (
          <>
            <div className="-mx-2 mt-2">
              <PriceChart pair={`${chart.symbol}USDT`} interval="1h" type="line" height={170} compact />
            </div>
            <button onClick={chart.open} className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 text-xs font-bold text-accent hover:underline">
              <Icon name="chart" className="h-3.5 w-3.5" /> Open full {chart.symbol}/USDT chart
            </button>
          </>
        ) : (
          <>
            <div className="mt-2">
              {points === null && asset.priceId ? <div className="skeleton h-24" /> : <Sparkline points={points} up={up} />}
            </div>
            {points?.length > 0 && <p className="text-right text-[11px] text-muted">Last 7 days</p>}
          </>
        )}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted">Your address</dt>
          <dd className="flex items-center gap-1 font-mono text-xs">{shorten(holder)}<CopyButton value={holder} /></dd>
        </div>
        {asset.address && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">{asset.chain === "eth" ? "Contract" : "Mint"}</dt>
            <dd>
              <a className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline" href={addressUrl(asset.chain, asset.address, network)} target="_blank" rel="noreferrer">
                {shorten(asset.address)} <Icon name="external" className="h-3 w-3" />
              </a>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button icon="up" onClick={onSend}>Transfer</Button>
        <Button icon="down" variant="secondary" onClick={onReceive}>Receive</Button>
      </div>
      {onShowKey && (
        <Button variant="ghost" icon="key" onClick={onShowKey} className="mt-2 w-full">Export {network[asset.chain].name} private key</Button>
      )}
    </Modal>
  );
}

function RpcForm({ network, rpc, onRpc }) {
  const current = rpc[network.id] ?? {};
  const [form, setForm] = useState({ eth: current.eth ?? "", sol: current.sol ?? "" });
  const [msg, setMsg] = useState("");
  const valid = (u) => !u || /^https:\/\/\S+$/.test(u.trim());

  const save = (e) => {
    e.preventDefault();
    if (!valid(form.eth) || !valid(form.sol)) return setMsg("RPC URLs must start with https://");
    onRpc(network.id, { eth: form.eth.trim() || undefined, sol: form.sol.trim() || undefined });
    setMsg("Saved. Balances will reload.");
  };

  return (
    <form onSubmit={save} className="space-y-2 rounded-2xl border border-white/[.06] bg-ink/30 p-3">
      {["eth", "sol"].map((c) => (
        <div key={c}>
          <label className="mb-1 block text-xs font-semibold text-muted" htmlFor={`rpc-${c}`}>{network[c].name}</label>
          <input
            id={`rpc-${c}`}
            className="input py-2.5 font-mono text-xs"
            placeholder={network[c].custom ? "" : network[c].rpc}
            value={form[c]}
            onChange={(e) => { setForm({ ...form, [c]: e.target.value }); setMsg(""); }}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      ))}
      <p className="text-[11px] leading-relaxed text-muted">Leave blank for the default. Solana tokens and staking on mainnet need a full RPC (e.g. a free Helius or QuickNode key).</p>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" className="min-h-[40px] py-1.5 text-xs">Save RPC</Button>
        {msg && <span className="text-xs text-muted" role="status">{msg}</span>}
      </div>
    </form>
  );
}

const AUTOLOCK = [
  { value: 1, label: "1m" },
  { value: 5, label: "5m" },
  { value: 15, label: "15m" },
  { value: 60, label: "1h" },
];

export function SettingsSheet({ network, rpc, onRpc, prefs, setPref, onReveal, onChangePassword, onLock, onReset, onClose }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.next.length < 8) return setPwMsg({ error: true, text: "New password must be at least 8 characters." });
    if (pw.next !== pw.confirm) return setPwMsg({ error: true, text: "Passwords do not match." });
    setBusy(true);
    const err = await onChangePassword(pw.current, pw.next);
    setBusy(false);
    if (err) return setPwMsg({ error: true, text: err });
    setPw({ current: "", next: "", confirm: "" });
    setPwOpen(false);
    setPwMsg({ error: false, text: "Password updated." });
  };

  const row = "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-white/[.06] bg-ink/40 px-4 py-3 text-left text-sm font-semibold transition hover:border-white/15";

  return (
    <Modal title="Settings" onClose={onClose}>
      <p className="label">Security</p>
      <div className="space-y-2">
        <button className={row} onClick={onReveal}>
          <span className="flex items-center gap-3"><Icon name="key" /> Show recovery phrase</span>
          <Icon name="chevronRight" className="h-4 w-4 text-muted" />
        </button>
        <button className={row} onClick={() => { setPwOpen(!pwOpen); setPwMsg(null); }} aria-expanded={pwOpen}>
          <span className="flex items-center gap-3"><Icon name="lock" /> Change password</span>
          <Icon name="chevron" className={`h-4 w-4 text-muted transition ${pwOpen ? "rotate-180" : ""}`} />
        </button>
        {pwOpen && (
          <form onSubmit={changePw} className="space-y-2 rounded-2xl border border-white/[.06] bg-ink/30 p-3">
            {[["current", "Current password", "current-password"], ["next", "New password", "new-password"], ["confirm", "Confirm new password", "new-password"]].map(([k, l, ac]) => (
              <input key={k} type="password" aria-label={l} placeholder={l} autoComplete={ac} className="input" value={pw[k]} onChange={(e) => setPw({ ...pw, [k]: e.target.value })} />
            ))}
            {pw.next && <p className="text-xs text-muted">Strength: {["Too weak", "Weak", "Fair", "Good", "Strong"][passwordScore(pw.next)]}</p>}
            <Button type="submit" loading={busy} className="w-full">Update password</Button>
          </form>
        )}
        {pwMsg && <p className={`text-sm ${pwMsg.error ? "text-down" : "text-accent"}`} role="status">{pwMsg.text}</p>}
        <div className={row}>
          <span className="flex items-center gap-3 whitespace-nowrap"><Icon name="clock" /> Auto-lock</span>
          <Segmented label="Auto-lock after" value={prefs.autoLock} onChange={(v) => setPref("autoLock", v)} options={AUTOLOCK} />
        </div>
      </div>

      <p className="label mt-5">Display</p>
      <div className="space-y-2">
        <label className={`${row} cursor-pointer`}>
          <span className="flex items-center gap-3"><Icon name="eyeOff" /> Hide balances</span>
          <input type="checkbox" className="h-5 w-5 accent-accent" checked={prefs.hideBalances} onChange={(e) => setPref("hideBalances", e.target.checked)} />
        </label>
      </div>

      <p className="label mt-5">Custom RPC · {network.label}</p>
      <RpcForm network={network} rpc={rpc} onRpc={onRpc} />
      <p className="mt-2 text-xs text-muted">Prices by CoinGecko · ETH history by Blockscout</p>

      <div className="mt-5 space-y-2 border-t border-white/[.06] pt-4">
        <Button variant="secondary" icon="lock" onClick={onLock} className="w-full">Lock wallet</Button>
        {confirmReset ? (
          <div className="space-y-3">
            <Notice tone="danger">This erases the wallet from this device. Without your recovery phrase, funds can't be recovered.</Notice>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setConfirmReset(false)} className="flex-1">Cancel</Button>
              <Button variant="danger" onClick={onReset} className="flex-1">Erase</Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" icon="trash" onClick={() => setConfirmReset(true)} className="w-full">Erase wallet from this device</Button>
        )}
      </div>
    </Modal>
  );
}
