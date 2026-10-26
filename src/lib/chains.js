import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Contract, JsonRpcProvider, Wallet, formatEther, formatUnits, isAddress, parseUnits } from "ethers";
import { ERC20, NATIVE, SPL } from "./tokens";
import { CHAINS, NETWORKS } from "./networks";

export { NETWORKS, CHAINS };

const ethProviders = {};
const solConnections = {};
export const ethProvider = (net) =>
  (ethProviders[net.eth.rpc] ??= new JsonRpcProvider(net.eth.rpc, net.eth.chainId, { staticNetwork: true }));
export const solConnection = (net) => (solConnections[net.sol.rpc] ??= new Connection(net.sol.rpc, "confirmed"));

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
];

export function isValidAddress(chain, addr) {
  if (chain === "eth") return isAddress(addr);
  try {
    return PublicKey.isOnCurve(new PublicKey(addr).toBytes());
  } catch {
    return false;
  }
}

/** Which chain does this string look like an address for? */
export const detectChain = (addr) => (isValidAddress("eth", addr) ? "eth" : isValidAddress("sol", addr) ? "sol" : null);

/** Parse a decimal string into base units; returns null if invalid. */
export function toUnits(str, decimals) {
  try {
    const v = parseUnits(String(str), decimals);
    return v > 0n ? v : null;
  } catch {
    return null;
  }
}

/**
 * Every asset the account holds on this network (native + known tokens),
 * without prices. A holding: { id, chain, symbol, name, decimals, balance, address, priceId, color }.
 */
export async function getHoldings(account, net) {
  const out = [];
  const nativeJobs = ["eth", "sol"].map(async (c) => {
    const balance = c === "eth"
      ? Number(formatEther(await ethProvider(net).getBalance(account.eth.address)))
      : (await solConnection(net).getBalance(new PublicKey(account.sol.address))) / LAMPORTS_PER_SOL;
    return { ...NATIVE[c], id: c, address: null, balance };
  });

  const ethTokenJobs = (ERC20[net.id] ?? []).map(async (t) => {
    const raw = await new Contract(t.address, ERC20_ABI, ethProvider(net)).balanceOf(account.eth.address);
    return { ...t, chain: "eth", id: `eth:${t.address}`, balance: Number(formatUnits(raw, t.decimals)) };
  });

  const splJob = solConnection(net)
    .getParsedTokenAccountsByOwner(new PublicKey(account.sol.address), { programId: TOKEN_PROGRAM_ID })
    .then((res) =>
      res.value
        .map(({ account: a }) => a.data.parsed.info)
        .filter((i) => i.tokenAmount.uiAmount > 0)
        .map((i) => {
          const known = SPL[net.id]?.[i.mint];
          return {
            chain: "sol",
            id: `sol:${i.mint}`,
            address: i.mint,
            symbol: known?.symbol ?? `${i.mint.slice(0, 4)}…`,
            name: known?.name ?? "Unknown token",
            decimals: i.tokenAmount.decimals,
            priceId: known?.priceId,
            color: known?.color ?? "#64748b",
            balance: i.tokenAmount.uiAmount,
          };
        }),
    );

  const jobs = [...nativeJobs, ...ethTokenJobs, splJob];
  const labels = ["eth", "sol", ...ethTokenJobs.map(() => "eth-tokens"), "sol-tokens"];
  const results = await Promise.allSettled(jobs);
  const issues = new Set();
  results.forEach((r, i) => {
    if (r.status === "rejected") issues.add(labels[i]);
    else if (Array.isArray(r.value)) out.push(...r.value);
    else if (r.value.address === null || r.value.balance > 0) out.push(r.value);
  });
  // issues: which parts failed ("eth", "sol", "eth-tokens", "sol-tokens").
  return { holdings: out, issues: [...issues] };
}

/** { [priceId]: { usd, usd_24h_change } } */
export async function getPrices(ids) {
  const list = [...new Set(ids.filter(Boolean))].join(",");
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${list}&vs_currencies=usd&include_24hr_change=true`);
  if (!res.ok) throw new Error("price feed unavailable");
  return res.json();
}

/** 7-day price points for a sparkline. */
export async function getSparkline(priceId) {
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/${priceId}/market_chart?vs_currency=usd&days=7`);
  if (!res.ok) throw new Error("chart unavailable");
  const j = await res.json();
  return j.prices.filter((_, i) => i % 4 === 0).map((p) => p[1]);
}

// ---- Fees & sending ---------------------------------------------------------

export const SPEEDS = {
  slow: { label: "Slow", prio: 0.6, max: 1 },
  standard: { label: "Standard", prio: 1, max: 1.1 },
  fast: { label: "Fast", prio: 2, max: 1.4 },
};

const scale = (v, m) => (v * BigInt(Math.round(m * 100))) / 100n;

async function ethFeeParams(net, speed) {
  const fd = await ethProvider(net).getFeeData();
  const s = SPEEDS[speed];
  if (fd.maxFeePerGas) {
    return { maxFeePerGas: scale(fd.maxFeePerGas, s.max), maxPriorityFeePerGas: scale(fd.maxPriorityFeePerGas ?? 0n, s.prio) };
  }
  return { gasPrice: scale(fd.gasPrice ?? 0n, s.max) };
}

/** Estimated network fee in native units: { fee, symbol, extra? } */
export async function estimateFee(asset, account, to, amountStr, net, speed = "standard") {
  if (asset.chain === "eth") {
    const wallet = new Wallet(account.eth.privateKey, ethProvider(net));
    const value = toUnits(amountStr, asset.decimals) ?? 1n;
    let gas;
    try {
      gas = asset.address
        ? await new Contract(asset.address, ERC20_ABI, wallet).transfer.estimateGas(to, value)
        : await wallet.estimateGas({ to, value });
    } catch {
      gas = asset.address ? 65000n : 21000n;
    }
    const p = await ethFeeParams(net, speed);
    const perGas = p.maxFeePerGas ?? p.gasPrice;
    return { fee: Number(formatEther(gas * perGas)), symbol: "ETH", gas, params: p };
  }
  const conn = solConnection(net);
  let lamports = 5000;
  let note;
  if (asset.address) {
    const dst = getAssociatedTokenAddressSync(new PublicKey(asset.address), new PublicKey(to));
    if (!(await conn.getAccountInfo(dst))) {
      lamports += await conn.getMinimumBalanceForRentExemption(165);
      note = "Includes one-time token account creation for the recipient";
    }
  }
  return { fee: lamports / LAMPORTS_PER_SOL, symbol: "SOL", note };
}

/** Broadcasts a transfer of any supported asset. Resolves with { hash }. */
export async function send(asset, account, to, amountStr, net, feeInfo) {
  const value = toUnits(amountStr, asset.decimals);
  if (!value) throw new Error("Invalid amount");

  if (asset.chain === "eth") {
    const wallet = new Wallet(account.eth.privateKey, ethProvider(net));
    const overrides = { ...(feeInfo?.params ?? {}), ...(feeInfo?.gas ? { gasLimit: (feeInfo.gas * 12n) / 10n } : {}) };
    const tx = asset.address
      ? await new Contract(asset.address, ERC20_ABI, wallet).transfer(to, value, overrides)
      : await wallet.sendTransaction({ to, value, ...overrides });
    return { hash: tx.hash };
  }

  const kp = Keypair.fromSecretKey(account.sol.secretKey);
  const toPk = new PublicKey(to);
  const tx = new Transaction();
  if (asset.address) {
    const mint = new PublicKey(asset.address);
    const src = getAssociatedTokenAddressSync(mint, kp.publicKey);
    const dst = getAssociatedTokenAddressSync(mint, toPk);
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(kp.publicKey, dst, toPk, mint),
      createTransferCheckedInstruction(src, mint, dst, kp.publicKey, value, asset.decimals),
    );
  } else {
    tx.add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: toPk, lamports: value }));
  }
  return { hash: await sendAndConfirmTransaction(solConnection(net), tx, [kp]) };
}

// ---- Formatting & links -----------------------------------------------------

export const txUrl = (chain, hash, net) =>
  chain === "eth" ? `${net.eth.explorer}/tx/${hash}` : `${net.sol.explorer}/tx/${hash}${net.sol.cluster}`;

export const addressUrl = (chain, addr, net) =>
  chain === "eth" ? `${net.eth.explorer}/address/${addr}` : `${net.sol.explorer}/address/${addr}${net.sol.cluster}`;

export const shorten = (a, n = 6) => (a && a.length > n + 6 ? `${a.slice(0, n)}…${a.slice(-4)}` : a);

export const fmtAmount = (n, max = 4) =>
  n == null ? "—" : n === 0 ? "0" : n < 10 ** -max ? `<${(10 ** -max).toFixed(max)}` : n.toLocaleString("en-US", { maximumFractionDigits: max });

export const fmtUsd = (n) => (n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" }));

export const fmtPct = (n) => (n == null || !isFinite(n) ? "—" : `${Math.abs(n).toFixed(2)}%`);

export function timeAgo(ms) {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
