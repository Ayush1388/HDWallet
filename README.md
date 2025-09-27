# HD Wallet (Ethereum + Solana)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-blue)](https://hd-wallet-yoet.vercel.app/)

A simple and secure **HD (Hierarchical Deterministic) Wallet** built with **React, TailwindCSS, Solana Web3.js, and Ethers.js**.  
It allows you to generate and manage **Ethereum** and **Solana** wallets from a single mnemonic seed phrase, with support for multiple accounts.

---

## 🚀 Features
- 🔑 **Generate new HD Wallets** with a secure BIP39 mnemonic.  
- 🌐 **Cross-chain support** – Ethereum & Solana accounts from the same seed.  
- ➕ **Create multiple accounts** under the same wallet.  
- 👀 **Toggle private key visibility** for ETH & SOL accounts.  
- 💾 **Persistent storage** using `localStorage` (wallets remain after reload).  
- 🗑️ **Delete individual accounts** or reset the whole wallet.  
- 🎨 Clean UI with **TailwindCSS**.

---


## 🛠️ Tech Stack
- **React** (Frontend)
- **TailwindCSS** (Styling)
- **Ethers.js** (Ethereum wallet generation)
- **Solana Web3.js** + **TweetNaCl** (Solana keypairs)
- **ed25519-hd-key** (Derivation paths)
- **BIP39** (Mnemonic generation)

---

## 📦 Installation & Setup

Clone the repo:
```bash
git clone https://github.com/your-username/hd-wallet.git
cd hd-wallet
