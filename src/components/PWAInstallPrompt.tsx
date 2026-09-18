import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, CheckCircle, X, ExternalLink, Copy, Check, Sparkles, Shield, Info } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallPromptProps {
  variant?: 'navbar' | 'card' | 'login';
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ variant = 'navbar', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, directAppUrl, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  // If already running as an installed standalone app, hide prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    // 1. If native install prompt is directly available and not blocked by iframe
    if (isInstallable && !isInIframe) {
      setInstalling(true);
      const res = await install();
      setInstalling(false);
      if (res.success) {
        return;
      }
    }
    // 2. Open the comprehensive install dialog with direct action buttons
    setShowModal(true);
  };

  const handleCopyLink = () => {
    const targetUrl = directAppUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(targetUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const handleDirectInstallAction = async () => {
    if (isInstallable) {
      setInstalling(true);
      const res = await install();
      setInstalling(false);
      if (res.success) {
        setShowModal(false);
        return;
      }
    }

    // If inside iframe, open in a new standalone tab
    if (isInIframe) {
      const targetUrl = directAppUrl || window.location.href;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      setInstallMessage('Uygulama tam ekranda açıldı. Açılan yeni sekmede tarayıcınızın "Yükle" butonuna dokunun.');
      return;
    }

    if (isIOS) {
      setInstallMessage('Safari altındaki "Paylaş" [⬆️] ve ardından "Ana Ekrana Ekle" [+] butonuna basınız.');
    } else {
      setInstallMessage('Tarayıcınızın sağ üstündeki (⋮) menüsünden "Uygulamayı Yükle" veya "Ana Ekrana Ekle" butonuna basınız.');
    }
  };

  // Variant: Dashboard Card
  if (variant === 'card') {
    return (
      <>
        <div className={`p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 shadow-lg relative overflow-hidden ${className}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Rende Fabrika Uygulamasını Cihazınıza Yükleyin
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    PWA
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Telefonunuza, tabletinize veya bilgisayarınıza bağımsız tam ekran uygulama olarak kurun.
                </p>
              </div>
            </div>

            <button
              onClick={handleInstallClick}
              type="button"
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Uygulamayı Yükle</span>
            </button>
          </div>
        </div>

        {showModal && renderModal()}
      </>
    );
  }

  // Variant: Login Screen
  if (variant === 'login') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          type="button"
          title="Rende Fabrika Portalını Cihazınıza Yükleyin"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <Download className="w-4 h-4 text-white animate-bounce" />
          <span>Uygulamayı Yükle</span>
        </button>

        {showModal && renderModal()}
      </>
    );
  }

  // Variant: Default Navbar
  return (
    <>
      <button
        onClick={handleInstallClick}
        type="button"
        title="Rende Fabrika Portalını Telefonunuza veya Bilgisayarınıza Yükleyin"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold border border-blue-400/40 shadow-md shadow-blue-600/25 transition-all cursor-pointer hover:shadow-lg active:scale-95"
      >
        <Download className="w-3.5 h-3.5 text-white" />
        <span>Uygulamayı Yükle</span>
      </button>

      {showModal && renderModal()}
    </>
  );

  // Install Action Modal
  function renderModal() {
    const targetUrl = directAppUrl || (typeof window !== 'undefined' ? window.location.href : '');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn select-none">
        <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white max-h-[92vh] overflow-y-auto">
          {/* Kapat Butonu */}
          <button
            onClick={() => {
              setShowModal(false);
              setInstallMessage(null);
            }}
            type="button"
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* App Icon & Header */}
          <div className="flex items-center gap-3.5 mb-4">
            <img
              src="/pwa-192x192.png"
              alt="Rende Portal İkonu"
              className="w-14 h-14 rounded-2xl shadow-lg shadow-blue-500/20 border border-slate-700/80 bg-slate-800 object-cover shrink-0"
            />
            <div>
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                Rende Portal
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  PWA KURULUM
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Telefon, Tablet ve Masaüstü Yükleme Merkezi
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Rende Portal'ı telefonunuza veya bilgisayarınıza bağımsız bir uygulama gibi yükleyebilir, tek dokunuşla adres çubuğu olmadan tam ekran kullanabilirsiniz.
          </p>

          {/* Bilgi / Geri Bildirim Mesajı */}
          {installMessage && (
            <div className="mb-4 p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs flex items-center gap-2 animate-fadeIn">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{installMessage}</span>
            </div>
          )}

          {/* Öne Çıkan Birincil "Uygulamayı Yükle" Butonları */}
          <div className="space-y-2.5 mb-5">
            {/* 1. Birincil Yükle Butonu */}
            <button
              onClick={handleDirectInstallAction}
              disabled={installing}
              type="button"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Download className="w-5 h-5 text-white" />
              <span>
                {installing ? 'Yükleme Başlatılıyor...' : 'Uygulamayı Yükle'}
              </span>
            </button>

            {/* 2. Önizleme / iframe içinde çalışıyorsa doğrudan tam ekran açma butonu */}
            {isInIframe && (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
              >
                <ExternalLink className="w-4 h-4 text-blue-400" />
                <span>Uygulamayı Tam Ekranda Aç (Doğrudan Yükleme İçin)</span>
              </a>
            )}

            {/* 3. Link Kopyalama Butonu */}
            <button
              onClick={handleCopyLink}
              type="button"
              className="w-full py-2 px-3 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">Uygulama Bağlantısı Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Bağlantıyı Kopyala (Telefonda Açmak İçin)</span>
                </>
              )}
            </button>
          </div>

          {/* Platform Bazlı Kolay Kurulum Talimatları */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-blue-400" />
              Cihazınızda 3 Adımda Kolay Kurulum:
            </h4>

            {isIOS ? (
              /* iPhone & iPad Kılavuzu */
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs space-y-2.5">
                <div className="font-bold text-blue-200">
                  📱 iPhone / iPad (Safari):
                </div>
                <div className="space-y-2 text-slate-300 text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                    <span>Safari alt çubuğundaki <strong className="text-white">Paylaş (Share ⬆️)</strong> butonuna dokunun.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                    <span>Açılan menüyü kaydırıp <strong className="text-white">"Ana Ekrana Ekle" (+)</strong> seçeneğine dokunun.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                    <span>Sağ üstteki <strong className="text-white">"Ekle"</strong> butonuna basın. Rende Portal ana ekranınızda özel logosuyla belirecektir.</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Android & Masaüstü Kılavuzu */
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-2.5">
                <div className="font-bold text-slate-200">
                  🤖 Android (Chrome) &amp; Bilgisayar:
                </div>
                <div className="space-y-2 text-slate-300 text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                    <span>Yukarıdaki mavi <strong className="text-white">"Uygulamayı Yükle"</strong> butonuna dokunun.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                    <span>Veya Chrome sağ üstündeki <strong className="text-white">üç nokta (⋮)</strong> menüsünü açın.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                    <span><strong className="text-white">"Uygulamayı Yükle"</strong> veya <strong className="text-white">"Ana Ekrana Ekle"</strong> butonuna basın.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Avantajlar */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Tam Ekran Deneyimi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Tek Tıkla Hızlı Giriş</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Özel Rende Fabrika Logosu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Çevrimdışı Güvenli Hafıza</span>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={() => {
                setShowModal(false);
                setInstallMessage(null);
              }}
              type="button"
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    );
  }
};
