import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, CheckCircle, X, ArrowUpRight, Sparkles, Shield, Layers } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running as installed app, hide prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      const success = await install();
      setInstalling(false);
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {/* Navbar / Header Install Trigger Button */}
      <button
        onClick={handleInstallClick}
        title="Uygulamayı Telefonunuza / Bilgisayarınıza Yükleyin"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-blue-300 hover:text-blue-200 border border-blue-500/30 hover:border-blue-500/50 text-xs font-semibold transition-all cursor-pointer shadow-sm"
      >
        <Smartphone className="w-3.5 h-3.5 text-blue-400" />
        <span className="hidden sm:inline">Uygulama Olarak Yükle</span>
        <span className="sm:hidden">Yükle</span>
      </button>

      {/* Detail / Guided Install Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn select-none">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white">
            {/* Kapat Butonu */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* App Icon & Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <img
                src="/pwa-192x192.png"
                alt="Rende Portal İkonu"
                className="w-14 h-14 rounded-2xl shadow-lg shadow-blue-500/20 border border-slate-700/80 bg-slate-800 object-cover shrink-0"
              />
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                  Rende Portal
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    PWA UYGULAMA
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  iPhone, Android ve Masaüstü Kurulumu
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Rende Portal'ı telefonunuza veya tabletinize gerçek bir yerel uygulama gibi yükleyebilir, tek dokunuşla tam ekran (adres çubuğu olmadan) kullanabilirsiniz.
            </p>

            {/* Avantajlar */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center gap-2 text-[11px] text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Tek Tıkla Açılış</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center gap-2 text-[11px] text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Tam Ekran Deneyimi</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center gap-2 text-[11px] text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Özel Rende İkonu</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center gap-2 text-[11px] text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Hızlı &amp; Güvenli</span>
              </div>
            </div>

            {/* Kurulum Talimatları */}
            {isInstallable ? (
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    await install();
                    setShowModal(false);
                  }}
                  disabled={installing}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Şimdi Telefona / Cihaza Yükle</span>
                </button>
              </div>
            ) : isIOS ? (
              /* iOS Safari Kılavuzu */
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs space-y-3">
                <div className="font-bold text-blue-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  iPhone / iPad Safari'den Yükleme:
                </div>
                <div className="space-y-2 text-slate-300 text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                    <span>Safari tarayıcısının altındaki <strong className="text-white">Paylaş (Share)</strong> simgesine dokunun.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                    <span>Menüyü aşağı kaydırıp <strong className="text-white">"Ana Ekrana Ekle" (Add to Home Screen)</strong> seçeneğine dokunun.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                    <span>Sağ üstteki <strong className="text-white">"Ekle"</strong> butonuna basın. Rende Portal ana ekranınızda özel logosuyla belirecektir.</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Android Chrome veya Masaüstü Kılavuzu */
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-2.5">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  Android / Chrome Kurulumu:
                </div>
                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <p>1. Tarayıcınızın sağ üstündeki <strong>üç nokta (⋮)</strong> menüsüne dokunun.</p>
                  <p>2. <strong>"Uygulamayı Yükle"</strong> veya <strong>"Ana Ekrana Ekle"</strong> butonuna basın.</p>
                  <p>3. Uygulama telefonunuzun ana ekranına bağımsız bir uygulama olarak eklenecektir.</p>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
