import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n' // import i18n configuration
import App from './App.tsx'
import { isMobileDevice } from './utils/device'

// Apply device detection classes to body on load
if (isMobileDevice()) {
  document.body.classList.add('mobile-device');
  document.body.classList.remove('desktop-device');
} else {
  document.body.classList.add('desktop-device');
  document.body.classList.remove('mobile-device');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
