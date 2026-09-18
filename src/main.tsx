import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker to make the PWA fully installable as a WebAPK
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('Yeni sürüm mevcut, yenilemek için sayfayı kapatıp açın.');
      },
      onOfflineReady() {
        console.log('Uygulama çevrimdışı çalışmaya hazır.');
      }
    });
  } catch (e) {
    try {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    } catch {}
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

