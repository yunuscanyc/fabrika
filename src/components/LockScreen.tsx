import React, { useState, useEffect, useRef } from 'react';
import { Lock, Key, Shield, LogOut, ArrowRight, AlertCircle, Clock, Eye, EyeOff, Delete } from 'lucide-react';

interface LockScreenProps {
  onUnlock: (role?: 'admin' | 'ustabasi', userName?: string, adminId?: string) => void;
  onLogout: () => void;
  autoLockMinutes: number;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, onLogout, autoLockMinutes }) => {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  // Saat güncelleme
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sayfa açıldığında alanı temizle ve tarayıcının otomatik doldurmasını engelle
  useEffect(() => {
    setCode('');
    const clearTimer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = '';
        setCode('');
      }
    }, 100);
    return () => clearTimeout(clearTimer);
  }, []);

  const formatSaat = (d: Date) => {
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatTarih = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return `${day}.${month}.${year} ${gunler[d.getDay()]}`;
  };

  const handleUnlockSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!code.trim()) {
      setError('Lütfen PIN veya Parolanızı giriniz.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const userRole: 'admin' | 'ustabasi' = data.role === 'ustabasi' ? 'ustabasi' : 'admin';
        const userName: string = data.userName || (userRole === 'ustabasi' ? 'Ustabaşı' : '1. Yönetici');
        const adminId: string = data.adminId || (userRole === 'ustabasi' ? 'ustabasi' : 'admin1');
        sessionStorage.setItem('rende_user_role', userRole);
        sessionStorage.setItem('rende_user_name', userName);
        sessionStorage.setItem('rende_admin_id', adminId);
        localStorage.setItem('rende_last_active', Date.now().toString());
        sessionStorage.setItem('rende_last_active', Date.now().toString());
        onUnlock(userRole, userName, adminId);
      } else {
        setError(data.error || 'Hatalı PIN veya Parola!');
        setCode('');
        if (inputRef.current) inputRef.current.value = '';
      }
    } catch (err: any) {
      setError('Sunucu bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (val: string) => {
    setError(null);
    if (val === 'clear') {
      setCode('');
    } else if (val === 'backspace') {
      setCode(prev => prev.slice(0, -1));
    } else {
      setCode(prev => prev + val);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4 select-none animate-fadeIn">
      {/* Arka Plan Hareketli / Parlak Efektler */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-sm bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-white text-center">
        {/* Canlı Dijital Saat & Tarih */}
        <div className="mb-5">
          <div className="text-4xl font-black tracking-tight text-white font-mono drop-shadow-sm">
            {formatSaat(currentTime)}
          </div>
          <div className="text-xs font-semibold text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatTarih(currentTime)}</span>
          </div>
        </div>

        {/* Kilit Simgesi & Başlık */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/20 mb-2.5 ring-4 ring-orange-500/10">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-lg font-bold text-white tracking-tight">
          Ekran Kilitlendi
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
          Kaldığınız yerden devam etmek için PIN veya parolanızı girin.
        </p>

        {/* Hata Bildirimi */}
        {error && (
          <div className="my-3 p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center justify-center gap-1.5 animate-shake">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Kilit Açma Girişi (Tarayıcı otomatik doldurması kesin olarak engellendi) */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              name="screen_lock_security_pin_manual_no_fill"
              id="screen_lock_security_pin_manual_no_fill"
              autoComplete="one-time-code"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-form-type="other"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUnlockSubmit();
                }
              }}
              style={{
                WebkitTextSecurity: showCode ? 'none' : 'disc'
              } as any}
              placeholder="PIN Kodu veya Parola..."
              autoFocus
              className="w-full pl-4 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-center text-sm font-semibold tracking-widest text-white placeholder-slate-500 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner font-mono"
            />
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
              title={showCode ? 'Gizle' : 'Göster'}
            >
              {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Sayısal Tuş Takımı (Hızlı PIN Girişi için) */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 active:bg-blue-600 text-white font-bold text-sm border border-slate-700/60 transition-all font-mono active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeypadPress('clear')}
              className="py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold border border-slate-700/60 transition-all"
              title="Temizle"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 active:bg-blue-600 text-white font-bold text-sm border border-slate-700/60 transition-all font-mono active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('backspace')}
              className="py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-700 text-slate-400 hover:text-red-300 flex items-center justify-center border border-slate-700/60 transition-all"
              title="Sil"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Kilidi Aç & Çıkış Butonları */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleUnlockSubmit()}
              disabled={loading || !code}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Kilidi Aç</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-red-400 rounded-xl border border-slate-700 transition-all font-semibold text-xs flex items-center gap-1 cursor-pointer"
              title="Oturumu Tamamen Kapat"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Çıkış</span>
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-400" />
            Otomatik Kilit ({autoLockMinutes > 0 ? `${autoLockMinutes} dk` : 'Kapalı'})
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="text-slate-400 hover:text-blue-400 underline font-medium cursor-pointer"
          >
            Farklı Giriş
          </button>
        </div>
      </div>
    </div>
  );
};

