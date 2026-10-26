import { useEffect, useState } from "react";
import { Button, Icon, Modal, Notice, Segmented, Spinner } from "../ui";
import { fmtAmount, fmtUsd, shorten, txUrl } from "../../lib/chains";
import { createStake, deactivateStake, getValidators, withdrawStake } from "../../lib/staking";
import { isDemo } from "../../lib/demo";

const STATE_STYLE = {
  active: "bg-accent/15 text-accent",
  activating: "bg-amber-400/15 text-amber-200",
  deactivating: "bg-amber-400/15 text-amber-200",
  inactive: "bg-white/10 text-slate-200",
};

/**
 * Native SOL staking. tab "stake" delegates to a validator; tab "positions"
 * lists stake accounts with unstake / withdraw ("claim") actions.
 */
export function StakeSheet({ account, network, sol, stakes, stakesLoading, stakesError, initialTab = "stake", onChanged, onSettings, onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [validators, setValidators] = useState(null);
  const [vote, setVote] = useState(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [lastTx, setLastTx] = useState(null);

  useEffect(() => {
    if (tab !== "stake" || validators) return;
    getValidators(network)
      .then((v) => {
        setValidators(v);
        setVote(v[0]?.vote ?? null);
      })
      .catch(() => setValidators([]));
  }, [tab, validators, network]);

  const balance = sol?.balance ?? 0;
  const claimable = stakes.filter((s) => s.state === "inactive");
  const claimableSol = claimable.reduce((t, s) => t + s.sol, 0);
  const staked = stakes.filter((s) => s.state !== "inactive").reduce((t, s) => t + s.sol, 0);

  const run = async (id, fn, label) => {
    if (isDemo()) return setError("Transactions are disabled in demo mode.");
    setBusy(id);
    setError("");
    try {
      const hash = await fn();
      setLastTx({ hash, label });
      onChanged({ hash, label });
    } catch (e) {
      setError(e.message || "Transaction failed.");
    }
    setBusy(null);
  };

  const stake = () => {
    const amt = Number(amount);
    if (!(amt > 0)) return setError("Enter an amount to stake.");
    if (amt + 0.005 > balance) return setError("Leave a little SOL for rent and fees.");
    if (!vote) return setError("Choose a validator.");
    run("stake", () => createStake(account, vote, amt, network), `Staked ${amt} SOL`);
  };

  return (
    <Modal title="Stake SOL" onClose={busy ? () => {} : onClose} wide>
      <div className="mb-5 grid grid-cols-3 gap-2 text-center">
        {[
          ["Available", balance],
          ["Staked", staked],
          ["Claimable", claimableSol],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/[.06] bg-ink/50 px-2 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{k}</p>
            <p className="mt-1 font-bold tabular-nums">{fmtAmount(v)}</p>
          </div>
        ))}
      </div>

      <Segmented
        label="Staking"
        value={tab}
        onChange={(t) => { setTab(t); setError(""); }}
        className="mb-5 flex w-full"
        options={[{ value: "stake", label: "Stake" }, { value: "positions", label: `Positions${stakes.length ? ` (${stakes.length})` : ""}` }]}
      />

      {tab === "stake" && (
        <div className="space-y-4">
          <div>
            <p className="label">Validator</p>
            {!validators ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>
            ) : validators.length === 0 ? (
              <Notice>Couldn't load validators from {network.sol.name}. Try again later.</Notice>
            ) : (
              <ul className="max-h-60 space-y-2 overflow-y-auto pr-1" role="radiogroup" aria-label="Validator">
                {validators.map((v) => (
                  <li key={v.vote}>
                    <button
                      role="radio"
                      aria-checked={vote === v.vote}
                      onClick={() => setVote(v.vote)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${vote === v.vote ? "border-accent/50 bg-accent/10" : "border-white/[.06] bg-ink/40 hover:border-white/15"}`}
                    >
                      <span>
                        <span className="block font-mono text-sm">{shorten(v.vote, 8)}</span>
                        <span className="text-xs text-muted">{fmtAmount(v.stake, 0)} SOL staked</span>
                      </span>
                      <span className="text-right text-xs">
                        <span className="block font-bold">{v.commission}%</span>
                        <span className="text-muted">commission</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="flex items-end justify-between">
              <label className="label" htmlFor="stake-amt">Amount</label>
              <button className="mb-1.5 text-xs font-bold text-accent hover:underline" onClick={() => setAmount(String(Math.max(0, Math.floor((balance - 0.01) * 1e4) / 1e4)))}>
                Max {fmtAmount(Math.max(0, balance - 0.01))} SOL
              </button>
            </div>
            <input id="stake-amt" className="input text-lg font-bold tabular-nums" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
            {sol?.price > 0 && <p className="mt-1.5 text-xs text-muted">≈ {fmtUsd(Number(amount || 0) * sol.price)}</p>}
          </div>
          <Notice tone="info">Stake activates at the next epoch (~2 days) and earns rewards automatically. Unstaking takes one epoch before you can claim.</Notice>
          {error && <p className="text-sm text-down" role="alert">{error}</p>}
          <Button onClick={stake} loading={busy === "stake"} disabled={!validators?.length} icon="stake" className="w-full">Stake SOL</Button>
        </div>
      )}

      {tab === "positions" && (
        <div className="space-y-3">
          {claimable.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4">
              <div>
                <p className="text-sm font-bold">{fmtAmount(claimableSol)} SOL ready to claim</p>
                <p className="text-xs text-muted">From {claimable.length} inactive stake account{claimable.length > 1 ? "s" : ""}</p>
              </div>
              <Button icon="gift" loading={busy === "claim"} onClick={() => run("claim", () => withdrawStake(account, claimable, network), `Claimed ${fmtAmount(claimableSol)} SOL`)}>
                Claim
              </Button>
            </div>
          )}
          {stakesLoading && !stakes.length ? (
            <div className="flex justify-center py-8 text-muted"><Spinner className="h-5 w-5" /></div>
          ) : stakesError ? (
            <Notice>
              This {network.sol.name} RPC doesn't allow stake account lookups.{" "}
              <button onClick={onSettings} className="font-bold underline">Add a custom RPC</button> to manage positions.
            </Notice>
          ) : stakes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No stake accounts yet.</p>
          ) : (
            <ul className="space-y-2">
              {stakes.map((s) => (
                <li key={s.address} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[.06] bg-ink/40 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-bold tabular-nums">{fmtAmount(s.sol)} SOL</p>
                    <p className="truncate text-xs text-muted">{s.voter ? `Validator ${shorten(s.voter)}` : "Not delegated"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${STATE_STYLE[s.state]}`}>{s.state}</span>
                    {(s.state === "active" || s.state === "activating") && (
                      <Button variant="secondary" className="min-h-[36px] px-3 py-1 text-xs" loading={busy === s.address} onClick={() => run(s.address, () => deactivateStake(account, s.address, network), "Unstake requested")}>
                        Unstake
                      </Button>
                    )}
                    {s.state === "inactive" && (
                      <Button variant="secondary" className="min-h-[36px] px-3 py-1 text-xs" loading={busy === s.address} onClick={() => run(s.address, () => withdrawStake(account, [s], network), `Claimed ${fmtAmount(s.sol)} SOL`)}>
                        Withdraw
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-sm text-down" role="alert">{error}</p>}
          <p className="pt-1 text-xs text-muted">Ethereum staking (32 ETH validators or liquid staking) isn't supported yet.</p>
        </div>
      )}

      {lastTx && (
        <a href={txUrl("sol", lastTx.hash, network)} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          <Icon name="check" /> {lastTx.label} · view transaction <Icon name="external" className="h-3.5 w-3.5" />
        </a>
      )}
    </Modal>
  );
}
