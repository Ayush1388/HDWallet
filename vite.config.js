import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const vendorChunks = (id) => {
  if (!id.includes('node_modules')) return
  if (id.includes('lightweight-charts') || id.includes('fancy-canvas')) return 'vendor-charts'
  if (id.includes('ethers') || id.includes('@noble') || id.includes('@adraffy')) return 'vendor-eth'
  if (id.includes('@solana') || id.includes('tweetnacl') || id.includes('ed25519-hd-key') || id.includes('bn.js') || id.includes('borsh')) return 'vendor-sol'
  if (id.includes('react')) return 'vendor-react'
}

// https://vite.dev/config/
// `vite build`                  -> website (landing, markets, web wallet) in dist/
// `vite build --mode extension` -> Chrome extension popup in dist-extension/
export default defineConfig(({ mode }) => {
  const extension = mode === 'extension'
  return {
    plugins: [react(), nodePolyfills()],
    // Relative asset URLs so the site works under any path and the extension under chrome-extension://.
    base: './',
    publicDir: extension ? 'extension' : 'public',
    build: {
      outDir: extension ? 'dist-extension' : 'dist',
      emptyOutDir: true,
      // @solana/web3.js alone is ~900 kB; it's loaded only after unlock.
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: extension ? 'popup.html' : 'index.html',
        output: { manualChunks: vendorChunks },
      },
    },
  }
})
