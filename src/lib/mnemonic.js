// Kept separate from keys.js so onboarding doesn't pull in ethers / web3.js.
import { generateMnemonic, validateMnemonic } from "bip39";

export const newMnemonic = (words = 12) => generateMnemonic(words === 24 ? 256 : 128);

export const normalizeMnemonic = (m) => m.trim().toLowerCase().split(/\s+/).join(" ");
export const isValidMnemonic = (m) => validateMnemonic(normalizeMnemonic(m));
