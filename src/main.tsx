import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker to make the PWA fully installable as a WebAPK
// Only register if we are in a secure top-level context (not inside an AI Studio preview iframe)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.self === window.top) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('Yeni sürüm mevcut, yenilemek için sayfayı kapatıp açın.');
    },
    onOfflineReady() {
      console.log('Uygulama çevrimdışı çalışmaya hazır.');
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
