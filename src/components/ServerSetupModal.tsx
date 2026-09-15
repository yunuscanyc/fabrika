import React from 'react';
import { Smartphone, Server, Wifi, ShieldAlert, CheckCircle2, Copy, X, ExternalLink } from 'lucide-react';

interface ServerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerSetupModal: React.FC<ServerSetupModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Kopyalandı: ' + text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Bu Bilgisayarı Sunucu Yapma &amp; Telefondan Bağlanma Rehberi
              </h3>
              <p className="text-xs text-slate-500">Masaüstü bilgisayarınız açıkken tüm telefonlardan canlı erişin</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Adımlı Kolay Kurulum */}
        <div className="space-y-4 text-xs sm:text-sm">
          {/* 1. Adım: Bilgisayarın IP Adresini Öğrenme */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                1
              </span>
              <span>Bilgisayarınızın Yerel IP Adresini Öğrenin</span>
            </div>
            <p className="text-xs text-slate-600 pl-7 leading-relaxed">
              Klavyeden <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono font-bold">Win + R</kbd> basıp{' '}
              <code className="text-blue-700 font-bold">cmd</code> yazın. Açılan siyah ekrana{' '}
              <code className="text-blue-700 font-bold">ipconfig</code> yazıp Enter'a basın.
            </p>
            <div className="pl-7 bg-white p-2 rounded-lg border border-slate-200 font-mono text-xs flex items-center justify-between">
              <span>IPv4 Address . . . . . . . . . : <strong>192.168.1.XXX</strong></span>
              <span className="text-[10px] text-slate-400">Örnek IP</span>
            </div>
          </div>

          {/* 2. Adım: Windows Güvenlik Duvarı İzni */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                2
              </span>
              <span>Windows Güvenlik Duvarında 3000 Portuna İzin Verin</span>
            </div>
            <p className="text-xs text-slate-600 pl-7 leading-relaxed">
              Telefonunuzun bu bilgisayara bağlanabilmesi için PowerShell (Yönetici) açıp tek satır şu komutu yapıştırın:
            </p>
            <div className="pl-7">
              <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] flex items-center justify-between overflow-x-auto">
                <code>netsh advfirewall firewall add rule name="FabrikaWeb" dir=in action=allow protocol=TCP localport=3000</code>
                <button
                  onClick={() =>
                    copyToClipboard(
                      'netsh advfirewall firewall add rule name="FabrikaWeb" dir=in action=allow protocol=TCP localport=3000'
                    )
                  }
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 ml-2"
                  title="Komutu Kopyala"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. Adım: Telefondan Açma & Ana Ekrana Ekleme (PWA) */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                3
              </span>
              <span>Telefondan Tarayıcıyı Açın &amp; Ana Ekrana Ekleyin</span>
            </div>
            <p className="text-xs text-emerald-800 pl-7 leading-relaxed">
              Telefonunuz aynı fabrikanın Wi-Fi ağına bağlıyken Chrome veya Safari tarayıcısını açıp şunu yazın:
            </p>
            <div className="pl-7 bg-white p-2.5 rounded-lg border border-emerald-300 font-mono text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>http://192.168.1.XXX:3000</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                Mobil Uyumlu
              </span>
            </div>
            <div className="pl-7 text-xs text-emerald-900 font-medium">
              💡 <strong>İpucu:</strong> Tarayıcı menüsünden <strong>"Ana Ekrana Ekle"</strong> deyin. Telefonunuzda tıpkı marketten inmiş gibi kendi simgesiyle uygulama olarak açılır!
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Mevcut PostgreSQL ile %100 Uyumlu</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
