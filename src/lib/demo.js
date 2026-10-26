// `?demo` renders sample data so the UI can be reviewed without funded wallets.
export const isDemo = () => new URLSearchParams(window.location.search).has("demo");

// Public BIP-39 test vector. Never send real funds to it.
export const DEMO_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

export const DEMO_HOLDINGS = [
  { id: "eth", chain: "eth", symbol: "ETH", name: "Ethereum", decimals: 18, address: null, priceId: "ethereum", color: "#627eea", balance: 3.2481 },
  { id: "sol", chain: "sol", symbol: "SOL", name: "Solana", decimals: 9, address: null, priceId: "solana", color: "#14d9a0", balance: 42.18 },
  { id: "eth:usdc", chain: "eth", symbol: "USDC", name: "USD Coin", decimals: 6, address: "0xa0b8", priceId: "usd-coin", color: "#2775ca", balance: 3120.5 },
  { id: "eth:link", chain: "eth", symbol: "LINK", name: "Chainlink", decimals: 18, address: "0x5149", priceId: "chainlink", color: "#2a5ada", balance: 184.2 },
];

export const DEMO_PRICES = {
  ethereum: { usd: 2329.9, usd_24h_change: 1.1 },
  solana: { usd: 101.44, usd_24h_change: 2.9 },
  "usd-coin": { usd: 1, usd_24h_change: 0.01 },
  chainlink: { usd: 14.2, usd_24h_change: -1.8 },
};

const now = Date.now();
export const DEMO_ACTIVITY = [
  { id: "d1", chain: "eth", hash: "0xdemo1", dir: "in", symbol: "USDC", amount: 500, time: now - 36e5, status: "ok", peer: "0x3fc2a1b7c9d04e5f6a7b8c9d0e1f2a3b4c5d32dv" },
  { id: "d2", chain: "sol", hash: "demo2", dir: "out", symbol: "SOL", amount: 2.5, time: now - 5 * 36e5, status: "ok" },
  { id: "d3", chain: "eth", hash: "0xdemo3", dir: "out", symbol: "ETH", amount: 0.12, time: now - 30 * 36e5, status: "ok", peer: "0x9858EfFD232B4033E47d90003D41EC34EcaEda94" },
  { id: "d4", chain: "eth", hash: "0xdemo4", dir: "contract", symbol: "ETH", amount: 0, time: now - 60 * 36e5, status: "failed" },
];
