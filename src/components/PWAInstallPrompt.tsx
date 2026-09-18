import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Share2, 
  PlusSquare, 
  CheckCircle, 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Info, 
  Wifi, 
  Lock, 
  AlertTriangle,
  ChevronRight,
  Terminal
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallPromptProps {
  variant?: 'navbar' | 'card' | 'login';
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ variant = 'navbar', className = '' }) => {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    isAndroid, 
    isInIframe, 
    isSecure, 
    isLocalNetwork, 
    currentOrigin,
    directAppUrl, 
    install 
  } = usePWAInstall();

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'kurulum' | 'ssl'>('kurulum');
  const [installing, setInstalling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFlag, setCopiedFlag] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  // If already running as an installed standalone app, hide prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    // If native install prompt is directly available and not blocked by iframe
    if (isInstallable && !isInIframe && isSecure) {
      setInstalling(true);
      const res = await install();
      setInstalling(false);
      if (res.success) {
        return;
      }
    }
    // Open modal with instructions and actions
    if (!isSecure) {
      setActiveTab('ssl');
    } else {
      setActiveTab('kurulum');
    }
    setShowModal(true);
  };

  const handleCopyLink = () => {
    const targetUrl = directAppUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(targetUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleCopyOrigin = () => {
    const target = currentOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(target).then(() => {
        setCopiedFlag(true);
        setTimeout(() => setCopiedFlag(false), 2500);
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
      setInstallMessage('Uygulama tam ekranda yeni sekmede açıldı. Açılan sayfada sağ üstteki "Yükle" butonuna dokunabilirsiniz.');
      return;
    }

    if (!isSecure) {
      setActiveTab('ssl');
      setInstallMessage('Bağlantınız HTTP olduğu için tarayıcınız otomatik açılır pencereyi engelliyor. Aşağıdaki adımlarla saniyeler içinde yükleyebilirsiniz.');
      return;
    }

    if (isIOS) {
      setInstallMessage('Safari altındaki "Paylaş" [⬆️] ve ardından "Ana Ekrana Ekle" [+] butonuna basınız.');
    } else {
      setInstallMessage('Tarayıcınızın sağ üstündeki (⋮) menüsünden "Uygulamayı Yükle" veya "Ana Ekrana Ekle" seçiniz.');
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
                  {!isSecure && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      HTTP Modu
                    </span>
                  )}
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

  // Comprehensive Modal with SSL Diagnosis & Direct Solutions
  function renderModal() {
    const targetUrl = directAppUrl || (typeof window !== 'undefined' ? window.location.href : '');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn select-none">
        <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-white max-h-[94vh] overflow-y-auto">
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
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl shadow-lg shadow-blue-500/20 border border-slate-700/80 bg-slate-800 object-cover shrink-0"
            />
            <div>
              <h3 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                Rende Portal
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  PWA KURULUM
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Telefon, Tablet ve Masaüstü Yükleme Rehberi
              </p>
            </div>
          </div>

          {/* Güvenlik & SSL Durumu Göstergesi */}
          <div className={`p-2.5 sm:p-3 rounded-xl mb-4 border text-xs flex items-center justify-between ${
            isSecure 
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {isSecure ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>
                {isSecure ? (
                  <strong>SSL / HTTPS:</strong>
                ) : (
                  <strong>SSL Durumu:</strong>
                )} {isSecure ? 'Güvenli Bağlantı (HTTPS Aktif)' : 'HTTP Bağlantısı (SSL Yok veya Yerel IP)'}
              </span>
            </div>
            {!isSecure && (
              <button
                onClick={() => setActiveTab('ssl')}
                className="text-[11px] font-bold underline hover:text-white shrink-0 ml-2"
              >
                Çözümü Gör
              </button>
            )}
          </div>

          {/* Sekmeler (Tablar): Hızlı Kurulum & SSL Çözümleri */}
          <div className="flex border-b border-slate-800 mb-4">
            <button
              onClick={() => setActiveTab('kurulum')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'kurulum'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Cihaza Yükleme</span>
            </button>
            <button
              onClick={() => setActiveTab('ssl')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ssl'
                  ? 'border-amber-500 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>SSL &amp; Yerel Ağ Rehberi</span>
              {!isSecure && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Bilgi / Geri Bildirim Mesajı */}
          {installMessage && (
            <div className="mb-4 p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs flex items-center gap-2 animate-fadeIn">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{installMessage}</span>
            </div>
          )}

          {/* TAB 1: KURULUM */}
          {activeTab === 'kurulum' && (
            <div className="space-y-4">
              {/* Öne Çıkan Birincil "Uygulamayı Yükle" Butonları */}
              <div className="space-y-2.5">
                <button
                  onClick={handleDirectInstallAction}
                  disabled={installing}
                  type="button"
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Download className="w-5 h-5 text-white" />
                  <span>
                    {installing ? 'Yükleme Başlatılıyor...' : 'Uygulamayı Yükle'}
                  </span>
                </button>

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

                <button
                  onClick={handleCopyLink}
                  type="button"
                  className="w-full py-2 px-3 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedLink ? (
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

              {/* Platform Kurulum Talimatları */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  Cihazınızda 3 Adımda Kolay Kurulum:
                </h4>

                {isIOS ? (
                  <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs space-y-2.5">
                    <div className="font-bold text-blue-200">
                      📱 iPhone / iPad (Safari) — SSL Gerektirmez:
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
                        <span>Sağ üstteki <strong className="text-white">"Ekle"</strong> butonuna basın. Rende Portal ana ekranınızda özel logosuyla açılacaktır.</span>
                      </div>
                    </div>
                  </div>
                ) : (
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
                        <span>Otomatik açılmazsa Chrome sağ üstündeki <strong className="text-white">üç nokta (⋮)</strong> menüsünü açın.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                        <span><strong className="text-white">"Uygulamayı Yükle"</strong> veya <strong className="text-white">"Ana Ekrana Ekle"</strong> butonuna basın.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SSL & YEREL AĞ ÇÖZÜMLERİ */}
          {activeTab === 'ssl' && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>SSL Sertifikası (HTTPS) Neden Önemlidir?</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Google Chrome ve diğer modern tarayıcılar, dünya genelindeki güvenlik kuralları (W3C PWA Standardı) gereği, <strong>otomatik yükleme (WebAPK)</strong> özelliğini sadece <strong>HTTPS (SSL)</strong> olan adreslerde veya <strong>localhost</strong> üzerinde çalıştırır.
                </p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Yerel ağda (<code className="bg-amber-900/50 px-1 py-0.5 rounded font-mono">http://192.168.X.X:3000</code>) çalışırken tarayıcınız bu butonu kısıtlayabilir. Ancak <strong>aşağıdaki 3 yöntemle bunu saniyeler içinde aşabilirsiniz:</strong>
                </p>
              </div>

              {/* Çözüm 1: Ana Ekrana Ekle (SSL Gerekmez) */}
              <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>En Kolay Yol: "Ana Ekrana Ekle" (SSL Gerekmez)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 ml-auto">
                    Önerilen
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Tarayıcınızın kendi menüsünden ekleme yaptığınızda SSL sertifikası gerekmez ve uygulama logosuyla masaüstünüze/telefonunuza tam ekran kurulur:
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-300 pl-2">
                  <li>• <strong>Android (Chrome):</strong> Sağ üstteki <strong>üç nokta (⋮)</strong> menüsüne dokunun → <strong>"Ana Ekrana Ekle"</strong> veya <strong>"Kısayol Ekle"</strong> seçin.</li>
                  <li>• <strong>iPhone (Safari):</strong> Alt çubuktaki <strong>Paylaş (⬆️)</strong> butonuna dokunun → <strong>"Ana Ekrana Ekle" (+)</strong> seçin.</li>
                </ul>
              </div>

              {/* Çözüm 2: Chrome'da Yerel IP'yi Güvenli Tanımlama (30 Saniye) */}
              <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Chrome'da Yerel IP'yi Güvenli Sayma (Tek Seferlik)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Android telefonunuzda veya PC'nizde Chrome kullanıyorsanız, yerel ağ IP'nizi Chrome'a güvenli olarak tanıtabilirsiniz:
                </p>
                <div className="space-y-2 text-[11px] text-slate-300">
                  <p>1. Chrome adres çubuğuna şunu yazıp Enter'a basın:</p>
                  <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-blue-300 select-all break-all border border-slate-800">
                    chrome://flags/#unsafely-treat-insecure-origin-as-secure
                  </div>
                  <p>2. Kutucuğa şu anki adresinizi yapıştırın:</p>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 font-mono text-[11px] text-emerald-400 border border-slate-800">
                    <span>{currentOrigin || 'http://192.168.1.XXX:3000'}</span>
                    <button
                      onClick={handleCopyOrigin}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] rounded flex items-center gap-1 cursor-pointer"
                    >
                      {copiedFlag ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedFlag ? 'Kopyalandı' : 'Kopyala'}</span>
                    </button>
                  </div>
                  <p>3. Yanındaki seçeneği <strong>"Enabled"</strong> yapın ve <strong>"Relaunch"</strong> deyin. Artık doğrudan "Uygulamayı Yükle" butonu aktif olacaktır.</p>
                </div>
              </div>

              {/* Çözüm 3: Bulut Canlı Bağlantısı (Otomatik Google SSL) */}
              <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Hazır Google SSL Sertifikalı Canlı Bağlantı</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Uygulamanızın Google Cloud üzerindeki canlı adresi otomatik olarak <strong className="text-emerald-400">https://</strong> ve geçerli Google SSL sertifikasıyla çalışır. Bu linki telefonunuzda açtığınızda doğrudan "Yükle" butonu çalışır:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'HTTPS Bağlantısı Kopyalandı!' : 'Canlı HTTPS Bağlantısını Kopyala'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

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
