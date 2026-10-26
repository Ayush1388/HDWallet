import { mnemonicToSeed } from "bip39";
import nacl from "tweetnacl";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
import { HDNodeWallet } from "ethers";
import { normalizeMnemonic } from "./mnemonic";

const toHex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Derive account `index` for both chains from one seed.
 *   ETH: m/44'/60'/0'/0/{index}   (BIP-44, MetaMask / Ledger compatible)
 *   SOL: m/44'/501'/{index}'/0'   (Phantom / Solflare compatible)
 */
export async function deriveAccount(mnemonic, index) {
  const seed = await mnemonicToSeed(normalizeMnemonic(mnemonic));

  const solPath = `m/44'/501'/${index}'/0'`;
  const sol = derivePath(solPath, toHex(seed));
  const solKeypair = Keypair.fromSecretKey(nacl.sign.keyPair.fromSeed(sol.key).secretKey);

  const ethPath = `m/44'/60'/0'/0/${index}`;
  const eth = HDNodeWallet.fromSeed(seed).derivePath(ethPath);

  return {
    index,
    eth: { address: eth.address, privateKey: eth.privateKey, path: ethPath },
    sol: {
      address: solKeypair.publicKey.toBase58(),
      secretKey: solKeypair.secretKey,
      privateKey: toHex(solKeypair.secretKey),
      path: solPath,
    },
  };
}

export const deriveAccounts = (mnemonic, metas) =>
  Promise.all(metas.map((m) => deriveAccount(mnemonic, m.index).then((a) => ({ ...a, name: m.name }))));
