// Entry point for the browser-extension popup.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import WalletApp from './wallet/WalletApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WalletApp />
  </StrictMode>,
)
