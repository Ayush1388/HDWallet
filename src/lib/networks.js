// Network config; dependency-free so the app shell can import it cheaply.
// RPC URLs can be overridden at build time (VITE_*_RPC env vars) or per device in Settings.

const env = import.meta.env;

export const NETWORKS = {
  mainnet: {
    id: "mainnet",
    label: "Mainnet",
    eth: { name: "Ethereum", rpc: env.VITE_ETH_MAINNET_RPC || "https://ethereum-rpc.publicnode.com", chainId: 1, explorer: "https://etherscan.io", indexer: "https://eth.blockscout.com" },
    // Free public Solana mainnet RPCs block token/stake lookups; set a keyed RPC (e.g. Helius) for those.
    sol: { name: "Solana", rpc: env.VITE_SOL_MAINNET_RPC || "https://solana-rpc.publicnode.com", explorer: "https://explorer.solana.com", cluster: "" },
  },
  testnet: {
    id: "testnet",
    label: "Testnet",
    eth: { name: "Sepolia", rpc: env.VITE_ETH_TESTNET_RPC || "https://ethereum-sepolia-rpc.publicnode.com", chainId: 11155111, explorer: "https://sepolia.etherscan.io", indexer: "https://eth-sepolia.blockscout.com" },
    sol: { name: "Devnet", rpc: env.VITE_SOL_TESTNET_RPC || "https://api.devnet.solana.com", explorer: "https://explorer.solana.com", cluster: "?cluster=devnet" },
  },
};

export const CHAINS = {
  eth: { id: "eth", symbol: "ETH", color: "#627eea" },
  sol: { id: "sol", symbol: "SOL", color: "#14d9a0" },
};

const RPC_KEY = "hdwallet.rpc";

/** { [networkId]: { eth?: url, sol?: url } } */
export function readRpcOverrides() {
  try {
    return JSON.parse(localStorage.getItem(RPC_KEY)) || {};
  } catch {
    return {};
  }
}

export const saveRpcOverrides = (o) => localStorage.setItem(RPC_KEY, JSON.stringify(o));

export function resolveNetwork(id, overrides) {
  const base = NETWORKS[id] ?? NETWORKS.mainnet;
  const o = overrides[base.id] ?? {};
  return {
    ...base,
    eth: { ...base.eth, rpc: o.eth || base.eth.rpc, custom: !!o.eth },
    sol: { ...base.sol, rpc: o.sol || base.sol.rpc, custom: !!o.sol },
  };
}
