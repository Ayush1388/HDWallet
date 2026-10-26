import { useMemo, useState } from "react";
import { Button, CopyButton, Icon, Logo, Notice } from "./ui";
import { isValidMnemonic, newMnemonic, normalizeMnemonic } from "../lib/mnemonic";
import { passwordScore } from "../lib/vault";

function Shell({ children, wide }) {
  return (
    <main className="mx-auto flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-md"} animate-rise`}>{children}</div>
    </main>
  );
}

const features = [
  { icon: "shield", title: "Non-custodial", text: "Your keys are encrypted in this browser. We never see them." },
  { icon: "key", title: "One phrase, two chains", text: "A single recovery phrase controls Ethereum and Solana accounts." },
  { icon: "lock", title: "Auto-lock", text: "The wallet locks itself after a few minutes of inactivity." },
];

export function Welcome({ onCreate, onImport }) {
  return (
    <Shell wide>
      <div className="mb-10 flex flex-col items-center text-center">
        <Logo size="h-14 w-14" />
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Your keys.{" "}
          <span className="bg-gradient-to-r from-accent-soft to-accent-deep bg-clip-text text-transparent">Your assets.</span>
        </h1>
        <p className="mt-4 max-w-md text-balance text-muted">
          A hierarchical deterministic wallet for Ethereum and Solana. Create unlimited accounts from a single recovery phrase.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
          <Button onClick={onCreate} className="flex-1 py-3">Create new wallet</Button>
          <Button onClick={onImport} variant="secondary" className="flex-1 py-3">Import wallet</Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="card rounded-3xl p-4">
            <span className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent-soft">
              <Icon name={f.icon} />
            </span>
            <h3 className="text-sm font-semibold">{f.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{f.text}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function PasswordFields({ password, setPassword, confirm, setConfirm }) {
  const score = passwordScore(password);
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-accent", "bg-accent"];
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="pw">Password</label>
        <input id="pw" type="password" autoComplete="new-password" className="input" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        {password && (
          <div className="mt-2 flex items-center gap-3">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${i <= score ? colors[score] : "bg-line"}`} />
              ))}
            </div>
            <span className="text-xs text-muted">{labels[score]}</span>
          </div>
        )}
      </div>
      <div>
        <label className="label" htmlFor="pw2">Confirm password</label>
        <input id="pw2" type="password" autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
    </div>
  );
}

const passwordError = (pw, confirm) =>
  pw.length < 8 ? "Password must be at least 8 characters." : pw !== confirm ? "Passwords do not match." : "";

function Back({ onClick }) {
  return (
    <button onClick={onClick} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-slate-100">
      <Icon name="back" /> Back
    </button>
  );
}

function Steps({ step, total }) {
  return (
    <div className="mb-6 flex gap-1.5" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1 flex-1 rounded-full transition ${i < step ? "bg-accent" : "bg-line"}`} />
      ))}
    </div>
  );
}

export function CreateFlow({ onBack, onDone }) {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [words24, setWords24] = useState(false);
  const [mnemonic, setMnemonic] = useState(() => newMnemonic(12));
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const words = mnemonic.split(" ");
  // Re-pick the quiz positions whenever the phrase changes.
  const quiz = useMemo(() => {
    const picks = new Set();
    while (picks.size < 3) picks.add(Math.floor(Math.random() * mnemonic.split(" ").length));
    return [...picks].sort((a, b) => a - b);
  }, [mnemonic]);

  const toggleLength = () => {
    const next = !words24;
    setWords24(next);
    setMnemonic(newMnemonic(next ? 24 : 12));
    setRevealed(false);
  };

  const next1 = () => {
    const err = passwordError(password, confirm);
    err ? setError(err) : (setError(""), setStep(2));
  };

  const finish = async () => {
    if (quiz.some((i) => (answers[i] || "").trim().toLowerCase() !== words[i])) {
      setError("One or more words are incorrect. Check your written backup.");
      return;
    }
    setBusy(true);
    await onDone({ mnemonic, password });
  };

  return (
    <Shell wide={step > 1}>
      <Back onClick={step === 1 ? onBack : () => { setStep(step - 1); setError(""); }} />
      <div className="card p-6 sm:p-8">
        <Steps step={step} total={3} />

        {step === 1 && (
          <>
            <h2 className="text-2xl font-semibold">Secure your wallet</h2>
            <p className="mb-6 mt-1 text-sm text-muted">This password encrypts your recovery phrase on this device. It cannot be reset.</p>
            <PasswordFields {...{ password, setPassword, confirm, setConfirm }} />
            {error && <p className="mt-3 text-sm text-down" role="alert">{error}</p>}
            <Button onClick={next1} className="mt-6 w-full py-3">Continue</Button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-2xl font-semibold">Back up your recovery phrase</h2>
            <p className="mb-5 mt-1 text-sm text-muted">Write these words down in order and store them offline. Anyone with this phrase controls your funds.</p>
            <div className="relative">
              <ol className={`grid grid-cols-2 gap-2 sm:grid-cols-3 transition ${revealed ? "" : "select-none blur-md"}`}>
                {words.map((w, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-line bg-ink/60 px-3 py-2 font-mono text-sm">
                    <span className="w-5 text-right text-xs text-muted">{i + 1}</span>
                    {w}
                  </li>
                ))}
              </ol>
              {!revealed && (
                <button onClick={() => setRevealed(true)} className="absolute inset-0 grid place-items-center rounded-xl text-sm font-semibold">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-raised px-4 py-2.5 shadow-xl ring-1 ring-line">
                    <Icon name="eye" /> Click to reveal
                  </span>
                </button>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <CopyButton value={mnemonic} label="Copy phrase" />
              <button onClick={toggleLength} className="text-xs text-muted hover:text-slate-100">
                Use {words24 ? "12" : "24"} words instead
              </button>
            </div>
            <div className="mt-5">
              <Notice>Never share this phrase or type it into a website you don't trust. Support staff will never ask for it.</Notice>
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
              I have written down my recovery phrase and stored it somewhere safe.
            </label>
            <Button onClick={() => setStep(3)} disabled={!saved || !revealed} className="mt-6 w-full py-3">Continue</Button>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-2xl font-semibold">Confirm your backup</h2>
            <p className="mb-6 mt-1 text-sm text-muted">Enter the requested words to prove you saved your phrase.</p>
            <div className="space-y-3">
              {quiz.map((i) => (
                <div key={i}>
                  <label className="label" htmlFor={`w${i}`}>Word #{i + 1}</label>
                  <input id={`w${i}`} className="input font-mono" autoComplete="off" spellCheck={false} value={answers[i] || ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} />
                </div>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-down" role="alert">{error}</p>}
            <Button onClick={finish} loading={busy} className="mt-6 w-full py-3">Create wallet</Button>
          </>
        )}
      </div>
    </Shell>
  );
}

export function ImportFlow({ onBack, onDone }) {
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const count = normalizeMnemonic(phrase).split(" ").length;
    if (![12, 15, 18, 21, 24].includes(count) || !isValidMnemonic(phrase)) {
      return setError("That isn't a valid recovery phrase. Check for typos and word order.");
    }
    const err = passwordError(password, confirm);
    if (err) return setError(err);
    setBusy(true);
    await onDone({ mnemonic: normalizeMnemonic(phrase), password });
  };

  return (
    <Shell>
      <Back onClick={onBack} />
      <form onSubmit={submit} className="card p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Import wallet</h2>
        <p className="mb-6 mt-1 text-sm text-muted">Enter your 12 or 24 word recovery phrase and choose a password for this device.</p>
        <label className="label" htmlFor="phrase">Recovery phrase</label>
        <textarea id="phrase" rows={3} className="input resize-none font-mono" placeholder="word1 word2 word3 …" autoComplete="off" spellCheck={false} value={phrase} onChange={(e) => { setPhrase(e.target.value); setError(""); }} />
        <div className="mt-4">
          <PasswordFields {...{ password, setPassword, confirm, setConfirm }} />
        </div>
        {error && <p className="mt-3 text-sm text-down" role="alert">{error}</p>}
        <Button type="submit" loading={busy} className="mt-6 w-full py-3">Import wallet</Button>
      </form>
    </Shell>
  );
}

export function Unlock({ onUnlock, onReset }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const ok = await onUnlock(password);
    if (!ok) {
      setError("Incorrect password.");
      setBusy(false);
    }
  };

  return (
    <Shell>
      <form onSubmit={submit} className="card p-8 text-center">
        <div className="flex justify-center"><Logo size="h-12 w-12" /></div>
        <h2 className="mt-5 text-2xl font-semibold">Welcome back</h2>
        <p className="mb-6 mt-1 text-sm text-muted">Enter your password to unlock your wallet.</p>
        <input type="password" autoFocus autoComplete="current-password" aria-label="Password" className="input text-center" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="mt-3 text-sm text-down" role="alert">{error}</p>}
        <Button type="submit" loading={busy} disabled={!password} className="mt-4 w-full py-3">Unlock</Button>
        <div className="mt-6 border-t border-line pt-4">
          {confirmReset ? (
            <div className="space-y-2 text-xs text-muted">
              <p>This permanently erases the wallet from this device. You'll need your recovery phrase to restore it.</p>
              <div className="flex justify-center gap-2">
                <Button type="button" variant="danger" onClick={onReset} className="px-3 py-1.5 text-xs">Erase wallet</Button>
                <Button type="button" variant="ghost" onClick={() => setConfirmReset(false)} className="px-3 py-1.5 text-xs">Cancel</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className="text-xs text-muted hover:text-slate-100">
              Forgot password? Reset wallet
            </button>
          )}
        </div>
      </form>
    </Shell>
  );
}
