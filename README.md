# Aurora — Ethereum & Solana wallet extension

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-blue)](https://hd-wallet-yoet.vercel.app/)

A non-custodial **HD wallet browser extension** for Ethereum and Solana, plus a website with live
Binance-style market charts and a one-click extension download.

| Part | What it is |
| --- | --- |
| **Website** (`index.html`) | Landing page, live market table, a candlestick chart page for every coin, extension download page, and a web version of the wallet at `#/wallet` |
| **Extension** (`popup.html`) | The wallet as a Chrome / Edge / Brave popup (Manifest V3) |

> Append `?demo` (e.g. `/?demo#/wallet`) to explore the wallet with sample data — no password, nothing saved.

## Features

**Markets (website + extension)**
- 35 top coins with live price, 24h change, high/low, volume and 7-day sparklines
- Coin pages like Binance: candlestick or line chart with volume, 1m–1W timeframes, live order book and live trades (websockets)
- Data from Binance's public market-data API; charts by TradingView Lightweight Charts™

**Wallet**
- Create (12/24 words, backup + verify) or import a BIP-39 recovery phrase
- Vault encrypted with AES-256-GCM, key from PBKDF2-SHA256 (600k iterations)
- Auto-lock (1 / 5 / 15 / 60 min); in the extension the session survives closing the popup until it expires or the browser closes
- ETH, SOL, popular ERC-20s and all SPL tokens with USD value, 24h change and a 7-day portfolio chart
- Send any asset with fee estimates and speed control; receive with QR; scan QR to pay
- SOL staking: stake, unstake, claim
- Transaction history, notifications, multiple accounts, mainnet / testnet, custom RPC, hide balances
- Standard derivation paths (MetaMask / Ledger / Phantom compatible)

## Development

```bash
npm install
npm run dev          # website at http://localhost:5173 (wallet at /#/wallet)
npm run build        # builds the extension, zips it into public/downloads/, then builds the website
npm run build:ext    # extension only -> dist-extension/
npm run icons        # regenerate extension PNG icons
npm run lint
```

### Install the extension locally
1. `npm run build:ext`
2. Open `chrome://extensions`, enable **Developer mode**
3. **Load unpacked** → select the `dist-extension` folder

The website's **Download** button serves the same build as a zip (`downloads/aurora-wallet-extension.zip`).

### RPC configuration
Free public Solana **mainnet** RPCs block token and stake-account lookups. For SPL tokens and staking on
mainnet, set a keyed RPC per device (Settings → Custom RPC) or at build time:

```bash
VITE_SOL_MAINNET_RPC=https://mainnet.helius-rpc.com/?api-key=...
VITE_ETH_MAINNET_RPC=...
VITE_SOL_TESTNET_RPC=...
VITE_ETH_TESTNET_RPC=...
```

## Security notes
- Keys are derived in the browser and held in memory only while unlocked. In the extension, the password is
  cached in `chrome.storage.session` (memory-only, never written to disk, not exposed to web pages) until auto-lock.
- Not audited. Don't store significant funds in it.
