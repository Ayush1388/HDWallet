// Extension only: keeps the wallet unlocked across popup openings (like MetaMask).
// chrome.storage.session lives in memory, is cleared when the browser closes and
// is not exposed to content scripts. Outside the extension these are no-ops.

const store = () => globalThis.chrome?.storage?.session;
export const isExtension = () => !!globalThis.chrome?.runtime?.id;

const KEY = "unlock";

export async function saveSession(password, minutes) {
  await store()?.set({ [KEY]: { password, expires: Date.now() + minutes * 60_000 } });
}

/** Extends the expiry without touching the secret. */
export async function touchSession(minutes) {
  const s = store();
  if (!s) return;
  const { [KEY]: cur } = await s.get(KEY);
  if (cur) await s.set({ [KEY]: { ...cur, expires: Date.now() + minutes * 60_000 } });
}

/** The cached password if the session hasn't expired, else null. */
export async function loadSession() {
  const s = store();
  if (!s) return null;
  const { [KEY]: cur } = await s.get(KEY);
  if (!cur || cur.expires < Date.now()) {
    await s.remove(KEY);
    return null;
  }
  return cur.password;
}

export const clearSession = () => store()?.remove(KEY);
