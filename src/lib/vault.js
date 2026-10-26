// Password-encrypted vault stored in localStorage.
// PBKDF2-SHA256 -> AES-256-GCM. Only ciphertext is persisted; the derived
// CryptoKey is kept in memory (non-extractable) while the wallet is unlocked.

const STORAGE_KEY = "hdwallet.vault.v1";
const ITERATIONS = 600_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(password, salt, iterations) {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export const hasVault = () => !!localStorage.getItem(STORAGE_KEY);
export const clearVault = () => localStorage.removeItem(STORAGE_KEY);

/** Encrypt `data` with the session key and persist it. */
export async function saveVault(session, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, session.key, enc.encode(JSON.stringify(data)));
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ v: 1, iter: session.iter, salt: toB64(session.salt), iv: toB64(iv), ct: toB64(ct) }),
  );
}

export async function createVault(password, data) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const session = { salt, iter: ITERATIONS, key: await deriveKey(password, salt, ITERATIONS) };
  await saveVault(session, data);
  return session;
}

/** Throws if the password is wrong or the vault is corrupt. */
export async function unlockVault(password) {
  const rec = JSON.parse(localStorage.getItem(STORAGE_KEY));
  const salt = fromB64(rec.salt);
  const key = await deriveKey(password, salt, rec.iter);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(rec.iv) }, key, fromB64(rec.ct));
  return { session: { salt, iter: rec.iter, key }, data: JSON.parse(dec.decode(pt)) };
}

export async function verifyPassword(password) {
  try {
    await unlockVault(password);
    return true;
  } catch {
    return false;
  }
}

/** 0-4 rough strength score; length is weighted most. */
export function passwordScore(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
