// Transaction history. ETH comes from the public Blockscout indexer, SOL from RPC.
import { PublicKey } from "@solana/web3.js";
import { solConnection } from "./chains";

async function ethHistory(address, net) {
  const base = `${net.eth.indexer}/api/v2/addresses/${address}`;
  const [txRes, tokRes] = await Promise.all([fetch(`${base}/transactions`), fetch(`${base}/token-transfers`)]);
  if (!txRes.ok) throw new Error("indexer unavailable");
  const txs = (await txRes.json()).items ?? [];
  const toks = tokRes.ok ? ((await tokRes.json()).items ?? []) : [];
  const me = address.toLowerCase();
  const dirOf = (from, to) => (from === me && to === me ? "self" : from === me ? "out" : "in");

  const tokenHashes = new Set(toks.map((t) => t.transaction_hash));
  const items = [];

  for (const t of toks) {
    const dec = Number(t.total?.decimals ?? t.token?.decimals ?? 18);
    items.push({
      id: `${t.transaction_hash}:${t.log_index}`,
      chain: "eth",
      hash: t.transaction_hash,
      dir: dirOf(t.from.hash.toLowerCase(), t.to.hash.toLowerCase()),
      symbol: t.token?.symbol ?? "TOKEN",
      amount: Number(t.total?.value ?? 0) / 10 ** dec,
      time: new Date(t.timestamp).getTime(),
      status: "ok",
      peer: (t.from.hash.toLowerCase() === me ? t.to : t.from).hash,
    });
  }
  for (const t of txs) {
    const amount = Number(t.value) / 1e18;
    if (amount === 0 && tokenHashes.has(t.hash)) continue;
    const from = t.from?.hash?.toLowerCase();
    const to = t.to?.hash?.toLowerCase();
    items.push({
      id: t.hash,
      chain: "eth",
      hash: t.hash,
      dir: amount === 0 ? "contract" : dirOf(from, to),
      symbol: "ETH",
      amount,
      time: new Date(t.timestamp).getTime(),
      status: t.status === "error" || t.result?.includes?.("fail") ? "failed" : "ok",
      peer: from === me ? t.to?.hash : t.from?.hash,
    });
  }
  return items;
}

async function solHistory(address, net) {
  const conn = solConnection(net);
  const sigs = await conn.getSignaturesForAddress(new PublicKey(address), { limit: 12 });
  if (!sigs.length) return [];
  const parsed = await conn.getParsedTransactions(sigs.map((s) => s.signature), { maxSupportedTransactionVersion: 0 });
  const items = [];
  parsed.forEach((tx, i) => {
    if (!tx) return;
    const idx = tx.transaction.message.accountKeys.findIndex((k) => k.pubkey.toBase58() === address);
    if (idx < 0) return;
    const delta = (tx.meta.postBalances[idx] - tx.meta.preBalances[idx]) / 1e9;
    const tiny = Math.abs(delta) < 0.00002;
    items.push({
      id: sigs[i].signature,
      chain: "sol",
      hash: sigs[i].signature,
      dir: tiny ? "contract" : delta > 0 ? "in" : "out",
      symbol: "SOL",
      amount: Math.abs(delta),
      time: (tx.blockTime ?? 0) * 1000,
      status: tx.meta.err ? "failed" : "ok",
    });
  });
  return items;
}

/** Merged, newest-first history. `errors` lists chains that failed to load. */
export async function getActivity(account, net) {
  const [eth, sol] = await Promise.allSettled([ethHistory(account.eth.address, net), solHistory(account.sol.address, net)]);
  const errors = [];
  const items = [];
  if (eth.status === "fulfilled") items.push(...eth.value);
  else errors.push("eth");
  if (sol.status === "fulfilled") items.push(...sol.value);
  else errors.push("sol");
  return { items: items.sort((a, b) => b.time - a.time), errors };
}
