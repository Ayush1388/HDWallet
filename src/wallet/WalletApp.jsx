import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "../components/ui";
import { readRpcOverrides, resolveNetwork, saveRpcOverrides } from "../lib/networks";
import { clearVault, createVault, hasVault, saveVault, unlockVault, verifyPassword } from "../lib/vault";
import { DEMO_MNEMONIC, isDemo } from "../lib/demo";
import { clearSession, isExtension, loadSession, saveSession, touchSession } from "../lib/session";

// Code-split: onboarding ships without ethers/web3.js; the dashboard loads them on unlock.
const Onboarding = {
  Welcome: lazy(() => import("../components/Onboarding").then((m) => ({ default: m.Welcome }))),
  CreateFlow: lazy(() => import("../components/Onboarding").then((m) => ({ default: m.CreateFlow }))),
  ImportFlow: lazy(() => import("../components/Onboarding").then((m) => ({ default: m.ImportFlow }))),
  Unlock: lazy(() => import("../components/Onboarding").then((m) => ({ default: m.Unlock }))),
};
const Dashboard = lazy(() => import("../components/Dashboard"));
const loadKeys = () => import("../lib/keys");

const PREFS_KEY = "hdwallet.prefs";
const DEFAULT_PREFS = { autoLock: 5, hideBalances: false };

function readPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY)) };
  } catch {
    return DEFAULT_PREFS;
  }
}

const Loading = () => (
  <div className="grid min-h-[100dvh] place-items-center text-muted"><Spinner className="h-6 w-6" /></div>
);

export default function WalletApp() {
  // `?demo` skips onboarding and the lock screen with a throwaway wallet that is never saved.
  const [view, setView] = useState(isDemo() ? "demo" : !hasVault() ? "welcome" : isExtension() ? "resuming" : "locked");
  const [wallet, setWallet] = useState(null); // { session, mnemonic, metas, accounts }
  const [netId, setNetId] = useState(() => localStorage.getItem("hdwallet.network") || "mainnet");
  const [prefs, setPrefs] = useState(readPrefs);
  const [notifications, setNotifications] = useState([]);
  const [rpc, setRpc] = useState(readRpcOverrides);
  const network = useMemo(() => resolveNetwork(netId, rpc), [netId, rpc]);
  const unlocked = view === "ready" && !!wallet;

  const setPref = (k, v) =>
    setPrefs((p) => {
      const next = { ...p, [k]: v };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });

  const chooseNetwork = (id) => {
    setNetId(id);
    localStorage.setItem("hdwallet.network", id);
  };

  const updateRpc = (id, urls) =>
    setRpc((o) => {
      const next = { ...o, [id]: urls };
      saveRpcOverrides(next);
      return next;
    });

  const notify = useCallback((n) => {
    setNotifications((list) => [{ id: crypto.randomUUID(), time: Date.now(), read: false, ...n }, ...list].slice(0, 50));
  }, []);

  const open = async ({ session, mnemonic, metas }) => {
    const { deriveAccounts } = await loadKeys();
    const accounts = await deriveAccounts(mnemonic, metas);
    setWallet({ session, mnemonic, metas, accounts });
    setView("ready");
  };

  useEffect(() => {
    if (view === "demo") open({ session: null, mnemonic: DEMO_MNEMONIC, metas: [{ index: 0, name: "Demo Account" }] });
  }, [view]);

  // Extension popups close on blur; resume the unlocked session if it hasn't expired.
  useEffect(() => {
    if (view !== "resuming") return;
    loadSession()
      .then(async (pw) => {
        if (!pw || !(await unlock(pw, false))) setView("locked");
      })
      .catch(() => setView("locked"));
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Demo wallets live in memory only.
  const persist = (data) => (wallet.session ? saveVault(wallet.session, data) : Promise.resolve());

  const create = async ({ mnemonic, password }) => {
    const metas = [{ index: 0, name: "Account 1" }];
    const session = await createVault(password, { mnemonic, metas });
    await saveSession(password, prefs.autoLock);
    await open({ session, mnemonic, metas });
    notify({ kind: "info", title: "Wallet ready", body: "Your recovery phrase is encrypted on this device." });
  };

  const unlock = async (password, remember = true) => {
    try {
      const { session, data } = await unlockVault(password);
      if (remember) await saveSession(password, prefs.autoLock);
      await open({ session, mnemonic: data.mnemonic, metas: data.metas });
      return true;
    } catch {
      return false;
    }
  };

  const lock = useCallback(() => {
    if (isDemo()) {
      window.location.href = window.location.pathname; // leaving demo = exit to the real wallet
      return;
    }
    clearSession();
    setWallet(null);
    setNotifications([]);
    setView("locked");
  }, []);

  const reset = () => {
    clearSession();
    clearVault();
    localStorage.removeItem("hdwallet.active");
    setWallet(null);
    setNotifications([]);
    setView("welcome");
  };

  const addAccount = async () => {
    const { deriveAccount } = await loadKeys();
    const index = Math.max(...wallet.metas.map((m) => m.index)) + 1;
    const meta = { index, name: `Account ${wallet.metas.length + 1}` };
    const metas = [...wallet.metas, meta];
    const derived = { ...(await deriveAccount(wallet.mnemonic, index)), name: meta.name };
    await persist({ mnemonic: wallet.mnemonic, metas });
    setWallet((w) => ({ ...w, metas, accounts: [...w.accounts, derived] }));
    return derived;
  };

  const rename = async (index, name) => {
    const metas = wallet.metas.map((m) => (m.index === index ? { ...m, name } : m));
    await persist({ mnemonic: wallet.mnemonic, metas });
    setWallet((w) => ({ ...w, metas, accounts: w.accounts.map((a) => (a.index === index ? { ...a, name } : a)) }));
  };

  /** Re-encrypts the vault under a new password (fresh salt). Returns an error message or null. */
  const changePassword = async (current, next) => {
    if (!wallet.session) return "Not available in demo mode.";
    if (!(await verifyPassword(current))) return "Current password is incorrect.";
    const session = await createVault(next, { mnemonic: wallet.mnemonic, metas: wallet.metas });
    setWallet((w) => ({ ...w, session }));
    await saveSession(next, prefs.autoLock);
    notify({ kind: "info", title: "Password changed" });
    return null;
  };

  // Auto-lock after inactivity.
  const timer = useRef();
  useEffect(() => {
    if (!unlocked) return;
    const ms = prefs.autoLock * 60 * 1000;
    let touched = 0;
    const bump = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(lock, ms);
      if (Date.now() - touched > 30_000) {
        touched = Date.now();
        touchSession(prefs.autoLock);
      }
    };
    const events = ["pointerdown", "pointermove", "keydown", "scroll"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    bump();
    return () => {
      clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [unlocked, lock, prefs.autoLock]);

  let screen;
  if (view === "welcome") screen = <Onboarding.Welcome onCreate={() => setView("create")} onImport={() => setView("import")} />;
  else if (view === "create") screen = <Onboarding.CreateFlow onBack={() => setView("welcome")} onDone={create} />;
  else if (view === "import") screen = <Onboarding.ImportFlow onBack={() => setView("welcome")} onDone={create} />;
  else if (view === "resuming") screen = <Loading />;
  else if (view === "locked") screen = <Onboarding.Unlock onUnlock={unlock} onReset={reset} />;
  else if (!unlocked) screen = <Loading />;
  else {
    screen = (
      <Dashboard
        accounts={wallet.accounts}
        mnemonic={wallet.mnemonic}
        network={network}
        setNetwork={chooseNetwork}
        prefs={prefs}
        setPref={setPref}
        rpc={rpc}
        onRpc={updateRpc}
        notifications={notifications}
        notify={notify}
        clearNotifications={() => setNotifications([])}
        markNotificationsRead={() => setNotifications((l) => l.map((n) => ({ ...n, read: true })))}
        onAddAccount={addAccount}
        onRename={rename}
        onLock={lock}
        onReset={reset}
        onChangePassword={changePassword}
      />
    );
  }

  return <Suspense fallback={<Loading />}>{screen}</Suspense>;
}
