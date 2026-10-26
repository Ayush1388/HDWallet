import { useEffect, useId, useRef, useState } from "react";
import { coinIcon } from "../lib/market";

const paths = {
  copy: "M8 8h10v12H8zM6 16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1",
  check: "M5 12.5l4.5 4.5L19 7.5",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6A16 16 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 4.4-1",
  send: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 6l-6 6 6 6",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  plus: "M12 5v14M5 12h14",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
  refresh: "M20 11a8 8 0 0 0-14.5-3.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.5 3.5M20 20v-4.5h-4.5",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  x: "M6 6l12 12M18 6L6 18",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  warn: "M12 4l9 16H3zM12 10v4M12 17h.01",
  key: "M15 8a4 4 0 1 1-3.9 4.9L4 20v-3l2-2h2v-2l3.1-3.1A4 4 0 0 1 15 8z",
  pencil: "M4 20l4-1 11-11-3-3L5 16zM14 7l3 3",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8",
  bell: "M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0",
  chevron: "M6 9l6 6 6-6",
  chevronRight: "M9 6l6 6-6 6",
  gift: "M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2.5 0-4.5-1-4.5-2.5S9.5 2.5 12 7zM12 7c2.5 0 4.5-1 4.5-2.5S14.5 2.5 12 7z",
  stake: "M12 3l9 4.5-9 4.5L3 7.5zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5",
  filter: "M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  wallet: "M4 7a2 2 0 0 1 2-2h11v4M4 7v10a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2zM16 14h.01",
  contract: "M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14",
  fail: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15 9l-6 6M9 9l6 6",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3",
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  bars: "M5 20V11M10 20V4M15 20v-8M20 20v-5",
  swap: "M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  chart: "M3 3v18h18M7 15l4-4 3 3 5-6",
  hex: "M12 3l7.5 4.25v9.5L12 21l-7.5-4.25v-9.5z",
  flame: "M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.6 3-5.6 3.8-9.3 2 1.3 3 3.2 3.2 5 1-.8 1.7-2 1.9-3.3 2.3 1.9 4.1 4.6 4.1 7.6 0 3.6-2.6 6.2-6.5 6.2z",
  star: "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z",
};

/**
 * Line icon. `duo` strokes it with the ember gradient (gold → orange → red),
 * the reference's "line duotone" treatment — use it sparingly, for primary actions.
 */
export function Icon({ name, className = "h-4 w-4", strokeWidth = 1.8, duo = false }) {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={duo ? `url(#${id})` : "currentColor"} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {duo && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FCCE54" />
            <stop offset=".55" stopColor="#FF8A3D" />
            <stop offset="1" stopColor="#E5352B" />
          </linearGradient>
        </defs>
      )}
      <path d={paths[name]} />
    </svg>
  );
}

export function Logo({ size = "h-9 w-9" }) {
  return (
    <span className={`${size} grid place-items-center rounded-xl border border-[rgba(255,236,220,.1)] bg-raised`}>
      <Icon name="hex" className="h-3/5 w-3/5" strokeWidth={2.4} duo />
    </span>
  );
}

const variants = {
  primary: "bg-cream text-ink hover:bg-white",
  secondary: "glass text-cream hover:border-[rgba(255,236,220,.16)]",
  ghost: "text-muted hover:bg-white/5 hover:text-cream",
  danger: "border border-down/30 bg-down/10 text-down hover:bg-down/20",
};

export function Button({ variant = "primary", icon, loading, children, className = "", ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition duration-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading ? <Spinner /> : icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export function Spinner({ className = "h-4 w-4" }) {
  return <span className={`${className} inline-block animate-spin rounded-full border-2 border-current border-t-transparent`} role="status" aria-label="Loading" />;
}

export function CopyButton({ value, label, className = "" }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label || "Copy"}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold text-muted transition hover:bg-white/5 hover:text-cream ${className}`}
    >
      <Icon name={done ? "check" : "copy"} className={`h-3.5 w-3.5 ${done ? "text-accent" : ""}`} />
      <span aria-live="polite">{done ? "Copied" : label}</span>
    </button>
  );
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.activeElement;
    ref.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-fade sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[32px] border border-white/[.07] bg-panel px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl outline-none animate-sheet sm:rounded-[32px] sm:pb-6 sm:animate-rise ${wide ? "sm:max-w-lg" : "sm:max-w-md"}`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-white/5 hover:text-cream">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Notice({ tone = "warn", children }) {
  const tones = {
    warn: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    danger: "border-down/30 bg-down/10 text-rose-100",
    info: "border-[rgba(255,236,220,.08)] bg-raised text-cream/85",
  };
  return (
    <div className={`flex gap-3 rounded-2xl border p-3 text-sm leading-relaxed ${tones[tone]}`}>
      <Icon name={tone === "info" ? "shield" : "warn"} className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** Token logo (CDN) with a letter-avatar fallback, plus a chain dot for tokens. */
export function TokenIcon({ asset, size = "h-11 w-11" }) {
  const [failed, setFailed] = useState(false);
  const logo = ({ WETH: "eth", wSOL: "sol" })[asset.symbol] ?? asset.symbol.toLowerCase();
  return (
    <span className={`relative grid ${size} shrink-0 place-items-center rounded-full ring-1 ring-white/10`} style={{ background: `radial-gradient(circle at 30% 25%, ${asset.color}55, ${asset.color}18 70%)` }}>
      {failed || asset.symbol.includes("…") ? (
        <span className="text-[11px] font-extrabold tracking-tight" style={{ color: asset.color }}>
          {asset.symbol.replace("…", "").slice(0, 4)}
        </span>
      ) : (
        <img src={coinIcon(logo)} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full rounded-full" />
      )}
      {asset.address && (
        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-panel ${asset.chain === "eth" ? "bg-eth" : "bg-sol"}`} title={asset.chain === "eth" ? "Ethereum" : "Solana"} />
      )}
    </span>
  );
}

export function Change({ value, className = "" }) {
  if (value == null || !isFinite(value)) return <span className={`text-muted ${className}`}>—</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 font-mono tabular-nums ${up ? "text-up" : "text-down"} ${className}`}>
      <svg viewBox="0 0 10 10" className={`h-2 w-2 ${up ? "" : "rotate-180"}`} aria-hidden="true"><path d="M5 1l4 7H1z" fill="currentColor" /></svg>
      <span className="sr-only">{up ? "up" : "down"}</span>
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export function Segmented({ options, value, onChange, label, className = "" }) {
  return (
    <div role="tablist" aria-label={label} className={`inline-flex rounded-full border border-white/[.06] bg-ink/50 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[36px] flex-1 rounded-full px-4 text-xs font-bold transition ${value === o.value ? "bg-raised text-cream shadow-pill" : "text-muted hover:text-cream"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
