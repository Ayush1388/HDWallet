import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button, CopyButton, Icon, Modal, Notice, Segmented, TokenIcon } from "../ui";
import { SPEEDS, estimateFee, fmtAmount, fmtUsd, isValidAddress, send, shorten, toUnits, txUrl } from "../../lib/chains";
import { isDemo } from "../../lib/demo";

export function SendSheet({ account, rows, network, initialAssetId, initialTo = "", onClose, onSent }) {
  const [assetId, setAssetId] = useState(initialAssetId ?? rows[0]?.id);
  const [to, setTo] = useState(initialTo);
  const [amount, setAmount] = useState("");
  const [speed, setSpeed] = useState("standard");
  const [step, setStep] = useState("form");
  const [fee, setFee] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const asset = rows.find((r) => r.id === assetId) ?? rows[0];
  const native = rows.find((r) => r.id === asset?.chain);
  const chainName = network[asset?.chain]?.name;
  const dest = to.trim();
  const amt = Number(amount) || 0;

  if (!asset) {
    return (
      <Modal title="Transfer" onClose={onClose}>
        <p className="text-sm text-muted">Balances are still loading. Try again in a moment.</p>
      </Modal>
    );
  }

  const quote = (spd = speed) => estimateFee(asset, account, isValidAddress(asset.chain, dest) ? dest : account[asset.chain].address, amount || "0", network, spd);

  const setMax = async () => {
    if (asset.address) return setAmount(String(asset.balance));
    setBusy(true);
    try {
      const f = await quote();
      setAmount(String(Math.max(0, Math.floor((asset.balance - f.fee * 1.2) * 1e6) / 1e6)));
    } catch {
      setAmount(String(Math.max(0, asset.balance - (asset.chain === "eth" ? 0.002 : 0.00001))));
    }
    setBusy(false);
  };

  const review = async () => {
    if (!isValidAddress(asset.chain, dest)) return setError(`Enter a valid ${chainName} address.`);
    if (!toUnits(amount, asset.decimals)) return setError("Enter a valid amount greater than zero.");
    if (amt > asset.balance) return setError(`You only have ${fmtAmount(asset.balance)} ${asset.symbol}.`);
    setError("");
    setBusy(true);
    try {
      const f = await quote();
      const nativeNeeded = f.fee + (asset.address ? 0 : amt);
      if (native && nativeNeeded > native.balance) {
        setError(asset.address ? `Not enough ${native.symbol} to pay the network fee.` : "Amount plus network fee exceeds your balance.");
      } else {
        setFee(f);
        setStep("review");
      }
    } catch (e) {
      setError(e.shortMessage || e.message || "Couldn't estimate the network fee.");
    }
    setBusy(false);
  };

  const changeSpeed = async (s) => {
    setSpeed(s);
    setFee(null);
    setFee(await quote(s).catch(() => null));
  };

  const confirm = async () => {
    if (isDemo()) return setError("Sending is disabled in demo mode.");
    setStep("sending");
    setError("");
    try {
      const r = await send(asset, account, dest, amount, network, fee);
      setResult(r);
      setStep("done");
      onSent({ asset, amount: amt, to: dest, hash: r.hash });
    } catch (e) {
      setError(e.shortMessage || e.message || "Transaction failed.");
      setStep("review");
    }
  };

  return (
    <Modal title={step === "done" ? "Sent" : `Transfer ${asset.symbol}`} onClose={step === "sending" ? () => {} : onClose}>
      {step === "form" && (
        <div className="space-y-4">
          {network.id === "mainnet" && !isDemo() && <Notice>You're on mainnet. Transfers use real funds and can't be reversed.</Notice>}
          <div>
            <label className="label" htmlFor="asset">Asset</label>
            <div className="relative">
              <select id="asset" className="input appearance-none pr-10" value={asset.id} onChange={(e) => { setAssetId(e.target.value); setError(""); }}>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.symbol} · {network[r.chain].name} — {fmtAmount(r.balance)}
                  </option>
                ))}
              </select>
              <Icon name="chevron" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="to">Recipient ({chainName})</label>
            <input id="to" className="input font-mono text-sm" placeholder={asset.chain === "eth" ? "0x…" : "Solana address"} value={to} onChange={(e) => { setTo(e.target.value); setError(""); }} autoComplete="off" spellCheck={false} />
          </div>
          <div>
            <div className="flex items-end justify-between">
              <label className="label" htmlFor="amt">Amount</label>
              <button type="button" disabled={busy} className="mb-1.5 text-xs font-bold text-accent hover:underline disabled:opacity-50" onClick={setMax}>
                Max {fmtAmount(asset.balance)} {asset.symbol}
              </button>
            </div>
            <div className="relative">
              <input id="amt" className="input pr-16 text-lg font-bold tabular-nums" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, "")); setError(""); }} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">{asset.symbol}</span>
            </div>
            {asset.price > 0 && <p className="mt-1.5 text-xs text-muted">≈ {fmtUsd(amt * asset.price)}</p>}
          </div>
          {error && <p className="text-sm text-down" role="alert">{error}</p>}
          <Button onClick={review} loading={busy} className="w-full">Review transfer</Button>
        </div>
      )}

      {(step === "review" || step === "sending") && (
        <div className="space-y-4">
          <div className="flex flex-col items-center py-2 text-center">
            <TokenIcon asset={asset} size="h-14 w-14" />
            <p className="mt-3 text-3xl font-extrabold tabular-nums">{amount} <span className="text-muted">{asset.symbol}</span></p>
            {asset.price > 0 && <p className="text-sm text-muted">{fmtUsd(amt * asset.price)}</p>}
          </div>
          {asset.chain === "eth" && (
            <Segmented label="Transaction speed" value={speed} onChange={changeSpeed} className="flex w-full" options={Object.entries(SPEEDS).map(([value, s]) => ({ value, label: s.label }))} />
          )}
          <dl className="divide-y divide-white/[.06] rounded-2xl border border-white/[.06] bg-ink/50 text-sm">
            {[
              ["From", `${account.name} · ${shorten(account[asset.chain].address)}`],
              ["To", shorten(dest, 10)],
              ["Network", chainName],
              ["Network fee", fee ? `${fmtAmount(fee.fee, 6)} ${fee.symbol}${native?.price ? ` · ${fmtUsd(fee.fee * native.price)}` : ""}` : "Estimating…"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          {fee?.note && <p className="text-xs text-muted">{fee.note}.</p>}
          {error && <p className="text-sm text-down" role="alert">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setStep("form"); setError(""); }} disabled={step === "sending"} className="flex-1">Edit</Button>
            <Button onClick={confirm} loading={step === "sending"} disabled={!fee} className="flex-1">{step === "sending" ? "Sending…" : "Confirm"}</Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent"><Icon name="check" className="h-8 w-8" strokeWidth={2.2} /></span>
          <h3 className="mt-4 text-xl font-bold">{amount} {asset.symbol} on its way</h3>
          <p className="mx-auto mt-1 max-w-xs break-all font-mono text-xs text-muted">{result.hash}</p>
          <a href={txUrl(asset.chain, result.hash, network)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
            View on explorer <Icon name="external" className="h-3.5 w-3.5" />
          </a>
          <Button onClick={onClose} className="mt-6 w-full">Done</Button>
        </div>
      )}
    </Modal>
  );
}

export function ReceiveSheet({ account, network, initialChain = "eth", onClose }) {
  const [chain, setChain] = useState(initialChain);
  const address = account[chain].address;
  const net = network[chain];
  const share = () => navigator.share?.({ title: `My ${net.name} address`, text: address }).catch(() => {});
  return (
    <Modal title="Receive" onClose={onClose}>
      <Segmented label="Chain" value={chain} onChange={setChain} className="mb-5 flex w-full" options={[{ value: "eth", label: network.eth.name }, { value: "sol", label: network.sol.name }]} />
      <div className="flex flex-col items-center">
        <div className="rounded-[28px] bg-white p-4 shadow-xl shadow-accent/10">
          <QRCodeSVG value={address} size={188} level="M" fgColor="#0A0F1C" />
        </div>
        <p className="mt-4 text-sm font-semibold">{account.name}</p>
        <p className="mt-2 w-full break-all rounded-2xl border border-white/[.06] bg-ink/50 p-3 text-center font-mono text-xs leading-relaxed">{address}</p>
        <div className="mt-3 flex gap-2">
          <CopyButton value={address} label="Copy address" />
          {typeof navigator !== "undefined" && navigator.share && (
            <button onClick={share} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-muted hover:bg-white/5 hover:text-slate-50">
              <Icon name="external" className="h-3.5 w-3.5" /> Share
            </button>
          )}
        </div>
      </div>
      <div className="mt-5">
        <Notice tone="info">Only send {net.name} assets to this address. Assets sent from other networks may be lost.</Notice>
      </div>
    </Modal>
  );
}

const parseScanned = (v) => v.trim().replace(/^(ethereum|solana):/i, "").split(/[?@/]/)[0];

/** Camera QR scanner (BarcodeDetector) with a paste fallback. */
export function ScanSheet({ onResult, onClose }) {
  const videoRef = useRef(null);
  const supported = "BarcodeDetector" in window;
  const [status, setStatus] = useState(supported ? "starting" : "unsupported");
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!supported) return;
    let stream;
    let raf;
    let stopped = false;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        stream = s;
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = s;
        await videoRef.current.play();
        setStatus("scanning");
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]) return onResult(parseScanned(codes[0].rawValue));
          } catch {
            /* frame not ready */
          }
          raf = setTimeout(tick, 250);
        };
        tick();
      })
      .catch(() => setStatus("denied"));
    return () => {
      stopped = true;
      clearTimeout(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [supported, onResult]);

  return (
    <Modal title="Scan QR code" onClose={onClose}>
      {status !== "unsupported" && status !== "denied" ? (
        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-[28px] bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-8 rounded-3xl border-2 border-accent/80 shadow-[0_0_0_999px_rgba(2,10,15,.45)]" />
          {status === "starting" && <p className="absolute inset-x-0 bottom-4 text-center text-xs text-muted">Starting camera…</p>}
        </div>
      ) : (
        <Notice>{status === "denied" ? "Camera access was blocked." : "QR scanning isn't supported in this browser."} Paste the address instead.</Notice>
      )}
      <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); manual.trim() && onResult(parseScanned(manual)); }}>
        <input aria-label="Address" className="input font-mono text-sm" placeholder="Paste an address" value={manual} onChange={(e) => setManual(e.target.value)} />
        <Button type="submit" disabled={!manual.trim()}>Go</Button>
      </form>
    </Modal>
  );
}
