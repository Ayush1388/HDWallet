// Packages dist-extension/ into public/downloads/ so the website can offer it.
import AdmZip from "adm-zip";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const SRC = "dist-extension";
const OUT_DIR = "public/downloads";
const OUT = `${OUT_DIR}/aurora-wallet-extension.zip`;

if (!existsSync(`${SRC}/manifest.json`)) {
  console.error(`${SRC}/manifest.json missing — run "vite build --mode extension" first.`);
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(`${SRC}/manifest.json`, "utf8"));
mkdirSync(OUT_DIR, { recursive: true });
const zip = new AdmZip();
zip.addLocalFolder(SRC, "aurora-wallet");
zip.writeZip(OUT);
console.log(`Packed Aurora Wallet v${version} -> ${OUT}`);
