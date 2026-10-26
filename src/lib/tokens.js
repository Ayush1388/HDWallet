// Curated token lists (addresses lowercased; ethers accepts non-checksummed input).
// `priceId` is the CoinGecko id used for USD price and 24h change.

export const NATIVE = {
  eth: { chain: "eth", symbol: "ETH", name: "Ethereum", decimals: 18, priceId: "ethereum", color: "#627eea" },
  sol: { chain: "sol", symbol: "SOL", name: "Solana", decimals: 9, priceId: "solana", color: "#14d9a0" },
};

export const ERC20 = {
  mainnet: [
    { symbol: "USDC", name: "USD Coin", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6, priceId: "usd-coin", color: "#2775ca" },
    { symbol: "USDT", name: "Tether", address: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6, priceId: "tether", color: "#26a17b" },
    { symbol: "DAI", name: "Dai", address: "0x6b175474e89094c44da98b954eedeac495271d0f", decimals: 18, priceId: "dai", color: "#f5ac37" },
    { symbol: "WETH", name: "Wrapped Ether", address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", decimals: 18, priceId: "weth", color: "#8a92b2" },
    { symbol: "LINK", name: "Chainlink", address: "0x514910771af9ca656af840dff83e8264ecf986ca", decimals: 18, priceId: "chainlink", color: "#2a5ada" },
    { symbol: "UNI", name: "Uniswap", address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", decimals: 18, priceId: "uniswap", color: "#ff007a" },
  ],
  testnet: [
    { symbol: "USDC", name: "USD Coin (Sepolia)", address: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238", decimals: 6, priceId: "usd-coin", color: "#2775ca" },
    { symbol: "LINK", name: "Chainlink (Sepolia)", address: "0x779877a7b0d9e8603169ddbd7836e478b4624789", decimals: 18, priceId: "chainlink", color: "#2a5ada" },
  ],
};

// Known SPL mints by network; unknown mints are still listed, just without a price.
export const SPL = {
  mainnet: {
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: "USDC", name: "USD Coin", priceId: "usd-coin", color: "#2775ca" },
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: "USDT", name: "Tether", priceId: "tether", color: "#26a17b" },
    DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: { symbol: "BONK", name: "Bonk", priceId: "bonk", color: "#f59e0b" },
    JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: "JUP", name: "Jupiter", priceId: "jupiter-exchange-solana", color: "#14b8a6" },
    So11111111111111111111111111111111111111112: { symbol: "wSOL", name: "Wrapped SOL", priceId: "solana", color: "#14d9a0" },
  },
  testnet: {
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": { symbol: "USDC", name: "USD Coin (Devnet)", priceId: "usd-coin", color: "#2775ca" },
  },
};
